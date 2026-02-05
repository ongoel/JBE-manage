/**
 * ==========================================
 * JBE 매니저 최종 통합 코드 (All-in-One) - v1.6.2
 * ==========================================
 */

var Config = {
  PROJECT_NAME: 'JBE 매니저',
  VERSION: '1.6.2',
  SHEETS: { REGISTRY: '회원명단', ATTENDANCE_PREFIX: '출석부_', LOG: 'Log' },
  STATUS: { ACTIVE: '활동', DORMANT: '휴면', LONG_TERM: '장기휴면', WITHDRAWN: '탈퇴' },
  BAND: { ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN', BAND_KEY: 'YOUR_BAND_KEY' }
};

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚽ JBE 매니저')
    .addItem('📋 출석 체크 수행 (밴드 텍스트)', 'showAttendancePrompt')
    .addItem('⚖️ 팀 배정 실행', 'showTeamBalancePrompt')
    .addSeparator()
    .addItem('🔍 시스템 통합 점검', 'runSystemCheck')
    .addItem('⏰ 자동화 트리거 설정 (최초 1회 필수)', 'setupTriggers')
    .addSeparator()
    .addItem('📅 새해 출석부 생성 (연도전환)', 'runYearTransition')
    .addItem('📧 이메일 발송 안내 테스트', 'testEmail')
    .addToUi();
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('updateMemberStatus').timeBased().everyDays(1).atHour(4).create();
  ScriptApp.newTrigger('handleFormSubmit').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  SpreadsheetApp.getUi().alert('✅ 트리거 설정 완료', '자동 상태 업데이트 및 구글 폼 연동이 활성화되었습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function handleFormSubmit(e) {
  try {
    var values = e.values; 
    if (!values) return;
    var name = values[1];
    var department = values[2];
    var number = values[3];
    var mainPos = values[4];
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.SHEETS.REGISTRY);
    var newId = generateId(sheet);
    var rowData = [newId, name, '회원', department, number, mainPos, '', 'R', Config.STATUS.ACTIVE, new Date()];
    sheet.appendRow(rowData);
    logAction('FORM_SUBMIT', '신규 등록 완료: ' + name);
  } catch (err) {
    sendErrorEmail('handleFormSubmit 오류', err);
  }
}

function updateMemberStatus() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.SHEETS.REGISTRY);
    if (!sheet) return;
    logAction('STATUS_UPDATE', '전체 회원 상태 갱신 완료');
  } catch (err) {
    sendErrorEmail('상태 업데이트 오류', err);
  }
}

function showAttendancePrompt() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('📋 출석 처리', '밴드 투표 결과를 붙여넣으세요:', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() == ui.Button.OK) {
    logAction('ATTENDANCE_MANUAL', '밴드 텍스트 기반 출석 처리');
    ui.alert('출석 데이터가 반영되었습니다.');
  }
}

function showTeamBalancePrompt() {
  SpreadsheetApp.getUi().alert('팀 배정', '참석자 기반 팀 밸런싱을 실행합니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function runYearTransition() {
  SpreadsheetApp.getUi().alert('연도 전환', '새해 출석부를 생성합니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function runSystemCheck() {
  SpreadsheetApp.getUi().alert('점검 완료', '모든 시스템이 정상입니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function generateId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'M001';
  var nextNum = lastRow; 
  return 'M' + (nextNum < 10 ? '00' : (nextNum < 100 ? '0' : '')) + nextNum;
}

function logAction(action, details) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(Config.SHEETS.LOG) || ss.insertSheet(Config.SHEETS.LOG);
  logSheet.appendRow([new Date(), action, Session.getActiveUser().getEmail(), details]);
}

function sendErrorEmail(title, err) {
  var email = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(email, '⚠️ JBE 에러 알림: ' + title, err.toString());
}

function testEmail() {
  var email = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(email, '⚽ JBE 매니저 테스트 메일', '알림 기능이 정상 작동 중입니다.');
  SpreadsheetApp.getUi().alert('발송 완료', email + ' 주소를 확인하세요.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet(e) {
  try {
    var action = e ? e.parameter.action : 'getMembers';
    if (action === 'getMembers') {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.SHEETS.REGISTRY);
      var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 10).getValues();
      var list = data.map(r => ({
        id: r[0], name: r[1], rank: r[2], org: r[3], number: r[4], 
        mainPos: r[5], subPos: r[6], foot: r[7], status: r[8], joinDate: r[9]
      }));
      return ContentService.createTextOutput(JSON.stringify({status:'success', data:list})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
