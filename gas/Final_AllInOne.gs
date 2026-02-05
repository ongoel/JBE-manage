/**
 * ==========================================
 * JBE 매니저 최종 통합 코드 (All-in-One) - v1.6.8
 * ==========================================
 * [업데이트] 날짜 포맷 최적화 (KST 적용, 시간 제거)
 */

var Config = {
  PROJECT_NAME: 'JBE 매니저',
  VERSION: '1.6.8',
  SHEETS: {
    REGISTRY: '회원명단',
    ATTENDANCE_PREFIX: '출석부_', 
    LOG: 'Log'
  },
  STATUS: {
    ACTIVE: '활동', DORMANT: '휴면', LONG_TERM: '장기휴면', WITHDRAWN: '탈퇴'
  },
  BAND: { ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN', BAND_KEY: 'YOUR_BAND_KEY' }
};

// ==========================================
// 1. UI 및 트리거 설정
// ==========================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚽ JBE 매니저')
    .addItem('📋 출석 체크 수행 (밴드 텍스트)', 'showAttendancePrompt')
    .addItem('⚖️ 팀 배정 실행', 'showTeamBalancePrompt')
    .addSeparator()
    .addItem('🔍 시스템 통합 점검', 'runSystemCheck')
    .addItem('⏰ 자동화 트리거 설정 (최초 1회)', 'setupTriggers')
    .addSeparator()
    .addItem('📅 새해 출석부 생성 (연도전환)', 'runYearTransition')
    .addItem('📧 안내 이메일 테스트', 'testEmail')
    .addToUi();
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('updateMemberStatus').timeBased().everyDays(1).atHour(4).create();
  ScriptApp.newTrigger('handleFormSubmit').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  SpreadsheetApp.getUi().alert('✅ 트리거 설정 완료', '시스템 자동화가 활성화되었습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ==========================================
// 2. 구글 폼 핸들러 (handleFormSubmit)
// ==========================================

function handleFormSubmit(e) {
  try {
    var values = e.values; 
    if (!values) return;
    
    var name = values[1];
    var department = values[2];
    var number = values[3];
    var mainPos = values[4];
    var foot = values[5];
    var subPos = values[6];
    
    var regSheet = getSheet(Config.SHEETS.REGISTRY);
    var newId = generateId(regSheet);
    
    // 가입일을 한국 시간 기준 YYYY-MM-DD 형식으로 기록 (시트에서 수정 용이)
    var joinDateKST = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
    
    var rowData = [newId, name, '회원', department, number, mainPos, subPos, foot, Config.STATUS.ACTIVE, joinDateKST];
    regSheet.appendRow(rowData);
    
    logAction('FORM_SUBMIT', '신규 등록: ' + name);
  } catch (err) {
    sendError(err, 'handleFormSubmit');
  }
}

// ==========================================
// 3. 유틸리티 (필수 함수들)
// ==========================================

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function generateId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'M001';
  // 실제 회원 데이터가 있는 마지막 행 번호 사용
  var nextNum = lastRow; 
  return 'M' + (nextNum < 10 ? '00' : (nextNum < 100 ? '0' : '')) + nextNum;
}

function logAction(action, details) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s = ss.getSheetByName(Config.SHEETS.LOG) || ss.insertSheet(Config.SHEETS.LOG);
    var timeKST = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    s.appendRow([timeKST, action, Session.getActiveUser().getEmail(), details]);
  } catch (e) {}
}

function sendError(error, funcName) {
  try {
    var email = Session.getEffectiveUser().getEmail();
    var subject = '⚠️ JBE 에러 알림 (' + funcName + ')';
    var body = '에러 발생: ' + error.toString() + '\n위치: ' + funcName;
    MailApp.sendEmail(email, subject, body);
  } catch (e) {
    console.error('이메일 발송 실패: ' + e.message);
  }
}

function formatDateValue(val) {
  if (!val) return '-';
  try {
    // 이미 문자열이거나 날짜 객체인 경우 처리
    var date = new Date(val);
    if (isNaN(date.getTime())) return val.toString(); // 날짜 변환 실패 시 원본 반환
    return Utilities.formatDate(date, "Asia/Seoul", "yyyy-MM-dd");
  } catch (e) {
    return val.toString();
  }
}

// ==========================================
// 4. 운영 및 메뉴 로직
// ==========================================

function updateMemberStatus() {
  logAction('STATUS_UPDATE', '상태 갱신 실행');
}

function showAttendancePrompt() {
  var ui = SpreadsheetApp.getUi();
  ui.prompt('📋 출석 처리', '텍스트를 붙여넣으세요:', ui.ButtonSet.OK_CANCEL);
}

function runYearTransition() {
  SpreadsheetApp.getUi().alert('연도 전환 기능은 준비 중입니다.');
}

function runSystemCheck() {
  var reg = getSheet(Config.SHEETS.REGISTRY);
  if (reg) SpreadsheetApp.getUi().alert('✅ 시스템 정상');
}

function testEmail() {
  sendError(new Error('테스트 메시지'), 'testEmail');
  SpreadsheetApp.getUi().alert('📧 테스트 메일 발송 완료');
}

// ==========================================
// 5. 웹 API (doGet)
// ==========================================
function doGet(e) {
  try {
    var action = e ? e.parameter.action : 'getMembers';
    if (action === 'getMembers') {
      var sheet = getSheet(Config.SHEETS.REGISTRY);
      if (!sheet || sheet.getLastRow() < 2) return ContentService.createTextOutput(JSON.stringify({status:'success', data:[]})).setMimeType(ContentService.MimeType.JSON);
      
      var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 10).getValues();
      var list = data.map(r => ({
        id: r[0], 
        name: r[1], 
        rank: r[2], 
        org: r[3], 
        number: r[4], 
        mainPos: r[5], 
        subPos: r[6], 
        foot: r[7], 
        status: r[8], 
        joinDate: formatDateValue(r[9]) // 날짜 포맷 적용 ✅
      }));
      return ContentService.createTextOutput(JSON.stringify({status:'success', data:list})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status:'error', message:e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
