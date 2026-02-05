/**
 * 데이터 유효성 검사 모듈
 * 등번호 중복 확인 및 중요 작업 전 상태 검증
 */

var Validator = {
  /**
   * 등번호가 이미 사용 중인지 확인합니다.
   * @param {number} number 확인할 등번호
   * @returns {boolean} 중복 여부 (true: 중복, false: 사용가능)
   */
  checkDuplicateBackNumber: function(number) {
    if (!number) return false;

    var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
    if (!sheet) return false;

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;

    // 등번호 열 데이터 가져오기
    var colIndex = Config.COLUMNS.REGISTRY.NUMBER;
    var numbers = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues().flat();

    // 숫자형으로 변환하여 비교
    return numbers.some(function(n) {
      return parseInt(n) === parseInt(number);
    });
  },

  /**
   * 연도 전환 작업이 안전한지 검증합니다.
   * 이미 다음 연도 시트가 존재하는지 확인합니다.
   * @returns {Object} { isValid: boolean, message: string }
   */
  validateTransition: function() {
    var nextYear = new Date().getFullYear() + 1;
    var newSheetName = Config.SHEETS.ATTENDANCE_PREFIX + nextYear;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(newSheetName);

    if (sheet) {
      return {
        isValid: false,
        message: '이미 ' + newSheetName + ' 시트가 존재합니다. 덮어쓰려면 기존 시트를 삭제하거나 이름을 변경하세요.'
      };
    }

    return { isValid: true, message: '유효함' };
  }
};
