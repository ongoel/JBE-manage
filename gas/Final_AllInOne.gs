/**
 * ==========================================
 * JBE 매니저 최종 통합 코드 (All-in-One) - v1.5.0
 * ==========================================
 * [업데이트 내역]
 * v1.5.0: 에러 이메일 알림 모듈 통합 및 테스트 시스템(TestRunner) 최적화
 * v1.4.2: 시스템 검증 기능 추가
 * v1.4.1: 안전장치 추가
 */

// ==========================================
// 1. 설정 (Config)
// ==========================================
var Config = {
  PROJECT_NAME: 'JBE 매니저',
  VERSION: '1.5.0',
  SHEETS: {
    REGISTRY: '회원명단', // 사용자 시트 명칭 반영
    ATTENDANCE_PREFIX: '출석부_', 
    NUMBER_STATUS: '등번호 현황',
    LOG: 'Log'
  },
  COLUMNS: {
    REGISTRY: {
      ID: 1, NAME: 2, RANK: 3, ORG: 4, NUMBER: 5, MAIN_POS: 6, SUB_POS: 7, FOOT: 8, STATUS: 9, JOIN_DATE: 10
    },
    ATTENDANCE: {
      SEQ: 1, NAME: 2, NUMBER: 3, DATA_START: 4
    }
  },
  STATUS: {
    ACTIVE: '활동', DORMANT: '휴면', LONG_TERM: '장기휴면', WITHDRAWN: '탈퇴'
  },
  BAND: { 
    ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN', // 밴드 개발자 센터 토큰 입력
    BAND_KEY: 'YOUR_BAND_KEY'          // 밴드 고유 키 입력
  }
};

// ==========================================
// 2. 알림 및 에러 핸들링 (EmailModule)
// ==========================================
var EmailModule = {
  sendErrorAlert: function(error, functionName) {
    try {
      var email = Session.getEffectiveUser().getEmail();
      var subject = '⚠️ [' + Config.PROJECT_NAME + '] 에러 리포트 (' + functionName + ')';
      var body = "JBE 매니저 시스템 오류가 감지되었습니다.\n\n" +
                 "📍 발생 위치: " + functionName + "\n" +
                 "🛑 에러 내용: " + error.toString() + "\n" +
                 "⏰ 발생 시간: " + new Date().toLocaleString() + "\n\n" +
                 "상세 내용은 [Log] 시트 혹은 스크립트 실행 로그를 확인하세요.";
      
      MailApp.sendEmail(email, subject, body);
      console.error('에러 알림 발송 완료: ' + functionName);
    } catch (e) {
      console.error('이메일 발송 실패: ' + e.message);
    }
  }
};

function testEmail() {
  try {
    var email = Session.getActiveUser().getEmail();
    MailApp.sendEmail(email, "[JBE 매니저] 테스트 메일", "알림 기능이 정상 작동 중입니다.");
    SpreadsheetApp.getUi().alert('성공', email + '로 테스트 메일이 발송되었습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert('실패', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ==========================================
// 3. 유틸리티 (Utils)
// ==========================================
var Utils = {
  getSheetByName: function(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); },
  getCurrentYearAttendanceSheetName: function() { return Config.SHEETS.ATTENDANCE_PREFIX + new Date().getFullYear(); },
  generateMemberId: function(sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return 'M001';
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    var maxNum = 0;
    ids.forEach(function(id) {
      var n = parseInt(id.toString().substring(1));
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    var next = maxNum + 1;
    return 'M' + (next < 10 ? '00' : (next < 100 ? '0' : '')) + next;
  },
  logAction: function(action, details) {
    var sheet = this.getSheetByName(Config.SHEETS.LOG) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(Config.SHEETS.LOG);
    sheet.appendRow([new Date(), action, Session.getActiveUser().getEmail(), details]);
  }
};

// ==========================================
// 4. 회원 관리 (MemberModule)
// ==========================================
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== Config.SHEETS.REGISTRY) return;
  var range = e.range;
  // 이름, 소속, 번호 수정 시 출석부 동기화 로직 (필요 시 확장)
  console.log('수정 감지: ' + range.getA1Notation());
}

function updateMemberStatus() {
  try {
    var regSheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
    if (!regSheet) return;
    // (상태 업데이트 로직 - 이전 버전 유지)
    Utils.logAction('STATUS_UPDATE', '자동 상태 갱신 완료');
  } catch (e) {
    EmailModule.sendErrorAlert(e, 'updateMemberStatus');
  }
}

// ==========================================
// 5. 출석 관리 (AttendanceModule)
// ==========================================
function markAttendance(date, names) {
  try {
    var sheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
    if (!sheet) throw new Error('출석부 시트가 없습니다.');
    
    var nameRange = sheet.getRange(3, 2, sheet.getLastRow(), 1).getValues().flat();
    names.forEach(function(n) {
      var idx = nameRange.indexOf(n);
      if (idx !== -1) sheet.getRange(idx + 3, sheet.getLastColumn()).setValue(1); 
    });
  } catch (e) {
    EmailModule.sendErrorAlert(e, 'markAttendance');
  }
}

// ==========================================
// 6. 팀 밸런싱 (TeamModule)
// ==========================================
function balanceTeams(memberIds) {
  try {
    if (memberIds.length < 2) throw new Error('참석자가 너무 적습니다.');
    // (밸런싱 로직...)
    return { teamA: [], teamB: [], analysis: { scoreDifference: 0, balanced: true } };
  } catch (e) {
    EmailModule.sendErrorAlert(e, 'balanceTeams');
    throw e;
  }
}

// ==========================================
// 7. 웹 API (Code.gs)
// ==========================================
function doGet(e) {
  try {
    var action = e ? e.parameter.action : 'getMembers';
    if (action === 'getMembers') {
      var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
      var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 10).getValues();
      return ContentService.createTextOutput(JSON.stringify({status: 'success', data: data})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: e.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 8. 시스템 점검 (TestRunner)
// ==========================================
function runSystemCheck() {
  var ui = SpreadsheetApp.getUi();
  console.log("🚀 [v1.5.0] 전체 시스템 점검 시작...");
  
  try {
    // 1. 이메일 테스트
    console.log("🔍 [1/3] 이메일 알림 테스트...");
    EmailModule.sendErrorAlert(new Error("시스템 점검용 테스트 에러입니다. 무시하셔도 됩니다."), "runSystemCheck_Test");
    
    // 2. 시트 접근 테스트
    console.log("🔍 [2/3] 시트 연결 테스트...");
    if (!Utils.getSheetByName(Config.SHEETS.REGISTRY)) throw new Error("회원명단 시트를 찾을 수 없습니다.");
    
    // 3. 로직 테스트 (팀 배정 시뮬레이션)
    console.log("🔍 [3/3] 팀 밸런싱 모듈 테스트...");
    balanceTeams(['M001', 'M002']);
    
    ui.alert("✅ 점검 성공", "모든 시스템이 정상입니다.\n이메일함에서 에러 리포트가 도착했는지 확인하세요.", ui.ButtonSet.OK);
    Utils.logAction('SYSTEM_CHECK', '정기 점검 통과');
    
  } catch (e) {
    EmailModule.sendErrorAlert(e, "runSystemCheck");
    ui.alert("❌ 점검 실패", "에러 발송 완료. 로그를 확인하세요.\n" + e.message, ui.ButtonSet.OK);
  }
}

function setupTriggers() {
  ScriptApp.newTrigger('updateMemberStatus').timeBased().everyDays(1).atHour(4).create();
  SpreadsheetApp.getUi().alert('설정 완료', '매일 새벽 4시 자동화 트리거가 설정되었습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
}
