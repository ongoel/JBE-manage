/**
 * JBE 매니저 웹 앱 진입점 (GAS Web App)
 *
 * GET 요청 처리: 회원 목록 조회 등 (현재 Mock 데이터)
 * POST 요청 처리: 회원 정보 수정, 삭제, 연도 이월 등 (안전장치 적용)
 */

/**
 * GET 요청 처리
 * @param {Object} e 이벤트 객체
 * @returns {ContentService.TextOutput} JSON 응답
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    var token = e.parameter.token;

    // 1. 공통 요약 데이터 (로그인 없이 접근 가능)
    if (action === 'getSummary') {
      var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
      var total = sheet.getLastRow() - 1;
      return createJSONOutput({ status: 'success', data: { totalMembers: total > 0 ? total : 0 } });
    }

    // 2. 상세 데이터 (세션 검증 필요)
    var session = AuthModule.validateSession(token);
    if (!session) {
      return createJSONOutput({ status: 'error', message: '접근 권한이 없습니다.', code: 'UNAUTHORIZED' });
    }

    if (action === 'getMembers') {
      var members = getMockMembers(); // 후에 실제 DB 연동
      return createJSONOutput({ status: 'success', data: members });
    }

    return createJSONOutput({ status: 'error', message: '알 수 없는 요청' });

  } catch (error) {
    return createJSONOutput({ status: 'error', message: error.toString() });
  }
}

/**
 * POST 요청 처리
 * @param {Object} e 이벤트 객체
 * @returns {ContentService.TextOutput} JSON 응답
 */
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    
    // 1. 로그인 처리는 세션 검증 없이 허용
    if (action === 'login') {
      var result = AuthModule.login(params.username, params.password);
      return createJSONOutput(result);
    }

    // 2. 다른 모든 요청은 세션 검증 필요
    var session = AuthModule.validateSession(params.token);
    if (!session) {
      return createJSONOutput({ success: false, message: '세션이 만료되었거나 권한이 없습니다.', code: 'UNAUTHORIZED' });
    }

    var result;
    switch (action) {
      case 'addMember':
        result = handleAddMember(params, session.username);
        break;
      case 'updateMember':
        result = handleUpdateMember(params, session.username);
        break;
      case 'deleteMember':
        result = handleDeleteMember(params, session.username);
        break;
      case 'transitionYear':
        result = handleTransitionYear(params, session.username);
        break;
      default:
        result = { success: false, message: '알 수 없는 액션' };
    }

    return createJSONOutput(result);

  } catch (error) {
    console.error('API Error: ' + error.toString());
    return createJSONOutput({ success: false, message: error.toString() });
  }
}

/**
 * JSON 응답 생성 (CORS 헤더 포함)
 * @param {Object} content 응답 데이터
 * @returns {ContentService.TextOutput}
 */
function createJSONOutput(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// === Action Handlers (with Safety Mechanisms) ===

function handleAddMember(params, user) {
  // params: { name, department, backNumber, mainPos, subPos, foot }

  // 등번호 중복 확인
  if (params.backNumber && Validator.checkDuplicateBackNumber(params.backNumber)) {
    return { status: 'error', message: '이미 사용 중인 등번호입니다: ' + params.backNumber };
  }

  var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
  var newId = Utils.generateMemberId(sheet);
  var joinDate = Utils.formatDate(new Date());

  var rowData = [
    newId,
    params.name,
    params.department,
    params.backNumber || '',
    params.mainPos,
    params.subPos,
    params.foot,
    Config.MEMBER_STATUS.ACTIVE,
    joinDate
  ];

  sheet.appendRow(rowData);

  // 출석부 동기화
  if (typeof MemberModule !== 'undefined' && MemberModule.syncNewMemberToAttendance) {
    MemberModule.syncNewMemberToAttendance(rowData);
  }

  Utils.logAction('ADD_MEMBER', user, 'Added member: ' + params.name + ' (' + newId + ')');
  return { status: 'success', data: { id: newId } };
}

function handleUpdateMember(params, user) {
  // params: { id, updates: { fieldName: value } }

  var id = params.id;
  if (!id) return { status: 'error', message: 'ID가 필요합니다.' };

  var updates = params.updates || {};

  // 등번호 변경 시 중복 확인
  if (updates.backNumber && Validator.checkDuplicateBackNumber(updates.backNumber)) {
    return { status: 'error', message: '이미 사용 중인 등번호입니다: ' + updates.backNumber };
  }

  var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
  var lastRow = sheet.getLastRow();
  var ids = sheet.getRange(2, Config.COLUMNS.REGISTRY.ID, lastRow - 1, 1).getValues().flat();
  var rowIndex = ids.indexOf(id);

  if (rowIndex === -1) {
    return { status: 'error', message: '회원을 찾을 수 없습니다: ' + id };
  }

  var row = rowIndex + 2;

  // 필드 매핑
  var map = {
    name: Config.COLUMNS.REGISTRY.NAME,
    department: Config.COLUMNS.REGISTRY.DEPARTMENT,
    backNumber: Config.COLUMNS.REGISTRY.NUMBER,
    mainPos: Config.COLUMNS.REGISTRY.MAIN_POS,
    subPos: Config.COLUMNS.REGISTRY.SUB_POS,
    foot: Config.COLUMNS.REGISTRY.FOOT,
    status: Config.COLUMNS.REGISTRY.STATUS
  };

  Object.keys(updates).forEach(function(key) {
    var col = map[key];
    if (col) {
      sheet.getRange(row, col).setValue(updates[key]);

      // 출석부 동기화 (이름, 소속, 등번호 변경 시)
      if (key === 'name' || key === 'department' || key === 'backNumber') {
        if (typeof MemberModule !== 'undefined' && MemberModule.syncUpdateToAttendance) {
          MemberModule.syncUpdateToAttendance(id, col, updates[key]);
        }
      }
    }
  });

  Utils.logAction('UPDATE_MEMBER', user, 'Updated member: ' + id + ', fields: ' + Object.keys(updates).join(', '));
  return { status: 'success' };
}

function handleDeleteMember(params, user) {
  // params: { id, force: boolean }
  var id = params.id;
  if (!id) return { status: 'error', message: 'ID가 필요합니다.' };

  if (!params.force) {
    return { status: 'error', message: '삭제를 확인해주세요 (force=true 필요).' };
  }

  // 중요 작업 전 백업
  BackupModule.snapshotSheet(Config.SHEETS.REGISTRY);

  var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
  var lastRow = sheet.getLastRow();
  var ids = sheet.getRange(2, Config.COLUMNS.REGISTRY.ID, lastRow - 1, 1).getValues().flat();
  var rowIndex = ids.indexOf(id);

  if (rowIndex === -1) {
    return { status: 'error', message: '회원을 찾을 수 없습니다: ' + id };
  }

  var row = rowIndex + 2;
  // 완전 삭제 대신 상태를 '탈퇴'로 변경
  sheet.getRange(row, Config.COLUMNS.REGISTRY.STATUS).setValue(Config.MEMBER_STATUS.WITHDRAWN);

  Utils.logAction('DELETE_MEMBER', user, 'Member withdrawn: ' + id);
  return { status: 'success' };
}

function handleTransitionYear(params, user) {
  // 1. 검증
  var check = Validator.validateTransition();
  if (!check.isValid) {
    return { status: 'error', message: check.message };
  }

  // 2. 백업
  var registryBackup = BackupModule.snapshotSheet(Config.SHEETS.REGISTRY);
  var currentAttendance = Utils.getCurrentYearAttendanceSheetName();
  var attendanceBackup = BackupModule.snapshotSheet(currentAttendance);

  // 3. 실행
  if (typeof ArchiveModule !== 'undefined' && ArchiveModule.createNewYearAttendance) {
    try {
        ArchiveModule.createNewYearAttendance(true); // true = silent mode
    } catch (e) {
        return { status: 'error', message: 'Transition failed: ' + e.toString() };
    }
  }

  Utils.logAction('TRANSITION_YEAR', user, 'Year transition completed');
  return { status: 'success' };
}

/**
 * Mock 회원 데이터 생성
 * @returns {Array} 회원 객체 배열
 */
function getMockMembers() {
  return [
    {
      id: 'M001',
      name: '홍길동',
      department: '개발팀',
      number: 10,
      mainPos: 'FW',
      subPos: 'MF',
      foot: 'R',
      status: '활동',
      joinDate: '2023-01-01'
    },
    {
      id: 'M002',
      name: '김철수',
      department: '기획팀',
      number: 7,
      mainPos: 'MF',
      subPos: 'DF',
      foot: 'L',
      status: '활동',
      joinDate: '2023-02-15'
    },
    {
      id: 'M003',
      name: '이영희',
      department: '디자인팀',
      number: 1,
      mainPos: 'GK',
      subPos: '-',
      foot: 'R',
      status: '휴면',
      joinDate: '2023-03-10'
    }
  ];
}
}
