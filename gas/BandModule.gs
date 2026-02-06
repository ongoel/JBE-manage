/**
 * 밴드 연동 및 투표 파싱 모듈
 */

var BandModule = {
  /**
   * 밴드에서 복사한 투표 인원 텍스트를 파싱합니다.
   * @param {string} rawText 콤마, 공백, 줄바꿈 등으로 구분된 이름들
   * @returns {Array} 파싱된 이름 리스트
   */
  parseVoteText: function(rawText) {
    if (!rawText) return [];
    
    // 콤마, 줄바꿈, 탭 등으로 분리하고 공백 제거
    var names = rawText.split(/[,\n\t]/).map(function(name) {
      return name.trim();
    }).filter(function(name) {
      return name.length > 0;
    });
    
    return names;
  },

  /**
   * 파싱된 명단을 기반으로 출석부에 참석(1) 표시를 합니다.
   * @param {string} dateStr 경기 날짜 (YYYY-MM-DD)
   * @param {Array} names 참석자 이름 리스트
   * @returns {Object} 처리 결과 {success, updatedCount, notFound}
   */
  markAttendance: function(dateStr, names) {
    try {
      var gameDate = new Date(dateStr);
      var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
      if (!attendanceSheet) return { success: false, message: '출석부 시트를 찾을 수 없습니다.' };
      
      var headers = attendanceSheet.getRange(1, 1, 1, attendanceSheet.getLastColumn()).getValues()[0];
      var dateColumnIndex = -1;
      
      // 해당 날짜의 열 찾기
      for (var i = 0; i < headers.length; i++) {
        if (headers[i] instanceof Date && 
            headers[i].toDateString() === gameDate.toDateString()) {
          dateColumnIndex = i + 1;
          break;
        }
      }
      
      if (dateColumnIndex === -1) {
        return { success: false, message: '출석부에 해당 날짜의 열이 없습니다.' };
      }
      
      var lastRow = attendanceSheet.getLastRow();
      var memberNames = attendanceSheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      var updatedCount = 0;
      var notFound = [];
      
      names.forEach(function(name) {
        var found = false;
        for (var i = 0; i < memberNames.length; i++) {
          if (memberNames[i] === name) {
            attendanceSheet.getRange(i + 2, dateColumnIndex).setValue(1);
            updatedCount++;
            found = true;
            break;
          }
        }
        if (!found) notFound.push(name);
      });
      
      return {
        success: true,
        updatedCount: updatedCount,
        notFound: notFound
      };
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  }
};
