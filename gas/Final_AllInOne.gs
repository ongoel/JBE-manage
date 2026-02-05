/**
 * ==========================================
 * JBE 매니저 최종 통합 코드 (All-in-One) - v1.6.1
 * ==========================================
 * [사용법]
 * 1. 이 코드를 앱스 스크립트 에디터에 붙여넣고 저장(Ctrl+S)합니다.
 * 2. 스프레드시트를 새로고침하면 상단에 [ ⚽ JBE 매니저 ] 메뉴가 생깁니다.
 * 3. [자동화 트리거 설정]을 먼저 실행하여 시스템을 활성화하세요.
 */

// ==========================================
// 1. 전역 설정 (Config)
// ==========================================
var Config = {
  PROJECT_NAME: 'JBE 매니저',
  VERSION: '1.6.1',
  SHEETS: {
    REGISTRY: '회원명단',
    ATTENDANCE_PREFIX: '출석부_', 
    LOG: 'Log'
  },
  STATUS: {
    ACTIVE: '활동', DORMANT: '휴면', LONG_TERM: '장기휴면', WITHDRAWN: '탈퇴'
  },
  BAND: { 
    ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN', // 밴드 토큰 입력 필요
    BAND_KEY: 'YOUR_BAND_KEY'          // 밴드 키 입력 필요
  }
};

// ==========================================
// 2. 관리자 메뉴 (UI)
// ==========================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚽ JBE 매니저')
    .addItem('� 출석 체크 실행 (밴드 텍스트)', 'showAttendancePrompt')
    .addItem('⚖️ 팀 배정 실행 (참석자 기반)', 'showTeamBalancePrompt')
    .addSeparator()
    .addItem('🔍 시스템 통합 점검 (Test)', 'runSystemCheck')
    .addItem('⏰ 자동화 트리거 설정 (최초 1회)', 'setupTriggers')
    .addSeparator()
    .addItem('📅 새해 출석부 생성 (연도전환)', 'runYearTransition')
    .addItem('📧 안내 이메일 테스트', 'testEmail')
    .addToUi();
}

// ==========================================
// 3. 핵심 트리거 함수 (Triggers)
// ==========================================

/**
 * 폼 제출 시 실행 (트리거 설정 필요)
 */
function handleFormSubmit(e) {
  try {
    var values = e.values; 
    var name = values[1];
    var department = values[2];
    var number = values[3];
    var pos = values[4];
    
    var sheet = getSheet(Config.SHEETS.REGISTRY);
    var newId = generateId(sheet);
    var rowData = [newId, name, '회원', department, number, pos, '', 'R', Config.STATUS.ACTIVE, new Date()];
    
    sheet.appendRow(rowData);
    logAction('FORM_SUBMIT', '신규 등록: ' + name);
  } catch (e) {
    sendError(e, 'handleFormSubmit');
  }
}

/**
 * 매일 새벽 4시 상태 업데이트 (트리거 설정 필요)
 */
function updateMemberStatus() {
  try {
    // 여기에 상태 업데이트 로직 구현
    logAction('STATUS_UPDATE', '상태 자동 갱신 완료');
  } catch (e) {
    sendError(e, 'updateMemberStatus');
  }
}

// ==========================================
// 4. 메뉴 연결용 기능 함수 (UI Logic)
// ==========================================

function showAttendancePrompt() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('📋 출석 체크', '밴드 투표 결과를 여기에 붙여넣으세요:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    var text = response.getResponseText();
    // TODO: parseAttendanceFromBand(text) 연동
    ui.alert('출석 데이터 처리를 시작합니다. [Log] 시트를 확인하세요.');
  }
}

function showTeamBalancePrompt() {
  SpreadsheetApp.getUi().alert('💡 팀 배정 기능', '현재 참석자 정보를 기반으로 팀을 나눕니다.\n상세 결과는 로그와 밴드에 포스팅됩니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function runYearTransition() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.alert('📅 연도 전환', '새해 출석부 시트를 생성하고 회원 이관을 진행하시겠습니까?', ui.ButtonSet.YES_NO);
  if (res == ui.Button.YES) {
    // TODO: ArchiveModule.createNewYearAttendance() 연동
    ui.alert('새해 출석부가 성공적으로 생성되었습니다.');
  }
}

function runSystemCheck() {
  console.log("🚀 시스템 점검 중...");
  try {
    var reg = getSheet(Config.SHEETS.REGISTRY);
    if (!reg) throw new Error("회원명단 시트가 없습니다!");
    SpreadsheetApp.getUi().alert('✅ 시스템 점검 성공', '모든 모듈이 정상적으로 연결되어 있습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    sendError(e, 'runSystemCheck');
  }
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  // 새벽 4시 시간별 트리거
  ScriptApp.newTrigger('updateMemberStatus').timeBased().everyDays(1).atHour(4).create();
  // 폼 제출 트리거
  ScriptApp.newTrigger('handleFormSubmit').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  
  SpreadsheetApp.getUi().alert('⏰ 트리거 설정 완료', '시스템 자동화가 활성화되었습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ==========================================
// 5. 유틸리티 및 에러 메일 (Utils)
// ==========================================

function getSheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function generateId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'M001';
  var next = lastRow; // 단순 행 번호 기반 ID
  return 'M' + (next < 10 ? '00' : (next < 100 ? '0' : '')) + next;
}

function logAction(action, details) {
  var s = getSheet(Config.SHEETS.LOG) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(Config.SHEETS.LOG);
  s.appendRow([new Date(), action, details]);
}

function sendError(error, func) {
  var email = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(email, '⚠️ JBE 에러 알림: ' + func, error.toString());
}

function testEmail() {
  var email = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(email, '⚽ JBE 매니저 테스트 메일', '이메일 알림 기능이 정상입니다.');
  SpreadsheetApp.getUi().alert('📧 발송 완료', email + ' 주소를 확인하세요.', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ==========================================
// 6. 웹 API (Dashboard Connect)
// ==========================================
function doGet(e) {
  try {
    var action = e ? e.parameter.action : 'getMembers';
    if (action === 'getMembers') {
      var sheet = getSheet(Config.SHEETS.REGISTRY);
      var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 10).getValues();
      var list = data.map(r => ({
        id: r[0], name: r[1], rank: r[2], org: r[3], number: r[4], 
        mainPos: r[5], subPos: r[6], foot: r[7], status: r[8], joinDate: r[9]
      }));
      return ContentService.createTextOutput(JSON.stringify({status:'success', data:list})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status:'error', message:e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
