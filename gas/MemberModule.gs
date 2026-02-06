/**
 * 회원 관리 모듈
 * 신규 가입, 등번호 관리, 데이터 동기화 담당
 */

/**
 * 구글 폼 제출 시 실행되는 트리거 함수
 * 신규 회원을 등록부에 추가하고, 출석부에도 반영합니다.
 * @param {Object} e 폼 제출 이벤트 객체
 */
function onFormSubmit(e) {
  try {
    // 1. 이벤트 객체에서 데이터 추출 (폼 질문 순서에 따라 인덱스 변경 가능)
    // 가정: [타임스탬프, 성명, 소속, 등번호, 주포지션, 선호포지션, 주발]
    var values = e.values;
    var name = values[1];
    var department = values[2];
    var backNumber = values[3] ? parseInt(values[3]) : ''; // 빈칸일 수 있음
    var mainPos = values[4];
    var subPos = values[5];
    var foot = values[6];

    var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
    
    // 2. 등번호 중복 확인 (등번호가 입력된 경우만)
    if (backNumber !== '') {
      if (checkDuplicateNumber(backNumber)) {
        // 중복 시 처리: 로그 남기기 또는 이메일 알림 (여기서는 일단 0으로 변경 후 알림 가정)
        console.warn('등번호 중복 발생: ' + backNumber + ', ' + name);
        // 정책에 따라 처리가 다르겠지만, 일단 비워두거나 자동 배정 로직 호출 가능
        backNumber = ''; // 중복 시 일단 비워둠
      }
    }

    // 3. 회원 ID 생성
    var newId = Utils.generateMemberId(sheet);
    var joinDate = Utils.formatDate(new Date());

    // 4. 등록부 시트에 추가
    // 순서: [ID, 성명, 직급, 소속, 등번호, 주포지션, 선호포지션, 주발, 상태, 가입일]
    var rowData = [
      newId,
      name,
      '일반', // 신규 회원은 기본 '일반'
      department,
      backNumber,
      mainPos, // 콤마로 구분된 최대 3개 (구글 폼 설정 변경 전제)
      subPos,
      foot,
      Config.MEMBER_STATUS.ACTIVE, // 기본 상태: 활동
      joinDate
    ];

    sheet.appendRow(rowData);
    console.log('신규 회원 등록 완료: ' + name + ' (' + newId + ')');

    // 5. 현재 연도 출석부에도 추가
    syncNewMemberToAttendance(rowData);

    // 로그 기록
    Utils.logAction('ADD_MEMBER_FORM', 'FormTrigger', 'Added member: ' + name + ' (' + newId + ')');

  } catch (error) {
    console.error('onFormSubmit 에러: ' + error.toString());
    EmailModule.sendErrorAlert(error, 'onFormSubmit');
  }
}

/**
 * 등번호가 이미 사용 중인지 확인합니다.
 * @param {number} number 확인할 등번호
 * @returns {boolean} 중복 여부 (true: 중복, false: 사용가능)
 */
function checkDuplicateNumber(number) {
  return Validator.checkDuplicateBackNumber(number);
}

/**
 * 사용 가능한 등번호를 추천합니다 (가장 낮은 숫자).
 * 0~99번 중 사용되지 않은 번호 반환
 * @returns {number} 추천 등번호
 */
function suggestAvailableNumber() {
  var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
  var lastRow = sheet.getLastRow();
  var usedNumbers = [];
  
  if (lastRow >= 2) {
    usedNumbers = sheet.getRange(2, Config.COLUMNS.REGISTRY.NUMBER, lastRow - 1, 1).getValues().flat();
  }
  
  // 1번부터 99번까지 확인
  for (var i = 1; i <= 99; i++) {
    if (!usedNumbers.includes(i)) {
      return i;
    }
  }
  return null; // 모든 번호 사용 중 (희박함)
}

/**
 * 신규 회원을 출석부 시트에 동기화합니다.
 * @param {Array} memberData 등록부에 추가된 회원 데이터 배열
 */
function syncNewMemberToAttendance(memberData) {
  var attendanceSheetName = Utils.getCurrentYearAttendanceSheetName();
  var attendanceSheet = Utils.getSheetByName(attendanceSheetName);
  
  if (!attendanceSheet) {
    console.log('출석부 시트가 없습니다. 동기화를 건너뜁니다: ' + attendanceSheetName);
    return;
  }

  // 출석부 구조: [ID, 성명, 등번호, 소속, ...]
  // memberData: [ID, 성명, 소속, 등번호, ...] -> 순서 주의
  var attendanceRow = [
    memberData[0], // ID
    memberData[1], // 성명
    memberData[3], // 등번호
    memberData[2]  // 소속
  ];

  attendanceSheet.appendRow(attendanceRow);
  console.log('출석부 동기화 완료: ' + memberData[1]);
}

/**
 * 시트 수정 시 실행되는 트리거 함수
 * 등록부에서 회원 정보(성명, 소속, 등번호) 수정 시 출석부에도 반영합니다.
 * @param {Object} e 수정 이벤트 객체
 */
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  // 등록부 시트인지 확인
  if (sheet.getName() !== Config.SHEETS.REGISTRY) return;

  var range = e.range;
  var col = range.getColumn();
  var row = range.getRow();

  // 헤더 행 제외
  if (row <= 1) return;

  // 수정된 열이 성명(2), 소속(3), 등번호(4) 중 하나인지 확인
  var cols = Config.COLUMNS.REGISTRY;
  if (col !== cols.NAME && col !== cols.DEPARTMENT && col !== cols.NUMBER) return;

  // 변경된 회원 ID 확인 (A열)
  var memberId = sheet.getRange(row, cols.ID).getValue();
  if (!memberId) return;

  // 동기화 실행
  syncUpdateToAttendance(memberId, col, e.value);
}

/**
 * 변경된 회원 정보를 출석부에 반영합니다.
 * @param {string} memberId 회원 ID
 * @param {number} colIndex 변경된 열 인덱스
 * @param {string} newValue 변경된 값
 */
function syncUpdateToAttendance(memberId, colIndex, newValue) {
  var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
  if (!attendanceSheet) return;

  // 출석부에서 해당 memberId를 가진 행 찾기
  // 출석부 A열이 ID라고 가정
  var lastRow = attendanceSheet.getLastRow();
  var ids = attendanceSheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  var rowIndex = ids.indexOf(memberId);

  if (rowIndex === -1) {
    console.warn('출석부에서 회원을 찾을 수 없음: ' + memberId);
    return;
  }

  // 출석부의 행 번호 (배열 인덱스 0 -> 2행)
  var targetRow = rowIndex + 2;
  var targetCol = -1;

  // 등록부 열 -> 출석부 열 매핑
  // 등록부: 이름(2), 소속(3), 등번호(4)
  // 출석부: ID(1), 이름(2), 등번호(3), 소속(4)
  if (colIndex === Config.COLUMNS.REGISTRY.NAME) targetCol = 2;
  else if (colIndex === Config.COLUMNS.REGISTRY.NUMBER) targetCol = 3;
  else if (colIndex === Config.COLUMNS.REGISTRY.DEPARTMENT) targetCol = 4;

  if (targetCol !== -1) {
    attendanceSheet.getRange(targetRow, targetCol).setValue(newValue);
    console.log('출석부 업데이트 완료 (' + memberId + '): ' + newValue);
    Utils.logAction('UPDATE_ATTENDANCE_SYNC', 'EditTrigger', 'Updated attendance for ' + memberId + ', val: ' + newValue);
  }
}
