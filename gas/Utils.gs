/**
 * 공통 유틸리티 함수 모음
 */

var Utils = {
  /**
   * 시트 이름을 기반으로 시트 객체를 반환합니다.
   * @param {string} sheetName 가져올 시트 이름
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} 시트 객체
   */
  getSheetByName: function(sheetName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.error('시트를 찾을 수 없습니다: ' + sheetName);
      // 에러 발생 시 알림 로직 추가 가능
    }
    return sheet;
  },

  /**
   * 현재 연도의 출석부 시트 이름을 반환합니다.
   * 예: '출석부_2026'
   * @returns {string} 출석부 시트 이름
   */
  getCurrentYearAttendanceSheetName: function() {
    var year = new Date().getFullYear();
    return Config.SHEETS.ATTENDANCE_PREFIX + year;
  },

  /**
   * 새로운 회원 ID를 생성합니다.
   * 기존 ID 중 가장 큰 숫자를 찾아 +1 합니다.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} registrySheet 등록부 시트
   * @returns {string} 새 회원 ID (예: M005)
   */
  generateMemberId: function(registrySheet) {
    var lastRow = registrySheet.getLastRow();
    if (lastRow < 2) return 'M001'; // 데이터가 없으면 M001부터 시작

    var ids = registrySheet.getRange(2, Config.COLUMNS.REGISTRY.ID, lastRow - 1, 1).getValues().flat();
    var maxNum = 0;
    
    ids.forEach(function(id) {
      if (id && id.startsWith('M')) {
        var num = parseInt(id.substring(1));
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    // 0 패딩 (3자리)
    var nextNum = maxNum + 1;
    var padding = '';
    if (nextNum < 10) padding = '00';
    else if (nextNum < 100) padding = '0';
    
    return 'M' + padding + nextNum;
  },

  /**
   * 날짜를 YYYY-MM-DD 형식의 문자열로 반환합니다.
   * @param {Date} date 날짜 객체
   * @returns {string} 포맷팅된 날짜 문자열
   */
  formatDate: function(date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
};
