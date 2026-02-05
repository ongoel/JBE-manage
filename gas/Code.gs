/**
 * 메인 API 엔드포인트 및 앱 진입점
 */

function doGet(e) {
  return ContentService.createTextOutput("JBE Manager API is running.");
}

function doPost(e) {
  var output = {};

  try {
    // 1. 요청 데이터 파싱
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var action = data.action;
    var params = data.params || {};
    var user = data.user || 'Unknown';

    // 2. 액션 라우팅
    switch (action) {
      case 'addMember':
        output = handleAddMember(params, user);
        break;
      case 'updateMember':
        output = handleUpdateMember(params, user);
        break;
      case 'deleteMember':
        output = handleDeleteMember(params, user);
        break;
      case 'transitionYear':
        output = handleTransitionYear(params, user);
        break;
      default:
        throw new Error('알 수 없는 액션입니다: ' + action);
    }

  } catch (error) {
    output = {
      status: 'error',
      message: error.toString()
    };
    console.error('API Error: ' + error.toString());
  }

  // 3. 응답 반환
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// === Action Handlers ===

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
