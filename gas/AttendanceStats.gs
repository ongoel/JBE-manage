/**
 * 출석 통계 모듈
 * 활동 회원 기준 출석률 및 월별 통계를 담당합니다.
 */

var AttendanceStats = {
  /**
   * 활동 회원을 정의하고 필터링합니다.
   * 기준: 최근 3개월 이내 1회 이상 출석한 회원
   * @returns {Array} 활동 회원 ID 배열
   */
  getActiveMembers: function() {
    try {
      var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
      if (!attendanceSheet || attendanceSheet.getLastRow() < 2) return [];
      
      var threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      var headers = attendanceSheet.getRange(1, 1, 1, attendanceSheet.getLastColumn()).getValues()[0];
      var memberIds = attendanceSheet.getRange(2, 1, attendanceSheet.getLastRow() - 1, 1).getValues().flat();
      var activeMembers = [];
      
      // 각 회원별로 최근 3개월 출석 여부 확인
      for (var i = 0; i < memberIds.length; i++) {
        var rowData = attendanceSheet.getRange(i + 2, 1, 1, attendanceSheet.getLastColumn()).getValues()[0];
        var hasAttended = false;
        
        // 날짜 열부터 확인 (보통 4열부터 날짜 시작)
        for (var j = 3; j < headers.length; j++) {
          if (headers[j] && headers[j] instanceof Date && headers[j] >= threeMonthsAgo) {
            if (rowData[j] === 1 || rowData[j] === '1') {
              hasAttended = true;
              break;
            }
          }
        }
        
        if (hasAttended) activeMembers.push(memberIds[i]);
      }
      
      return activeMembers;
    } catch (e) {
      Logger.log('getActiveMembers error: ' + e.toString());
      return [];
    }
  },

  /**
   * 월별 평균 출석률을 계산합니다.
   * @param {number} month 월 (1-12)
   * @returns {number} 출석률 (%)
   */
  getMonthlyAttendanceRate: function(month) {
    try {
      var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
      if (!attendanceSheet || attendanceSheet.getLastRow() < 2) return 0;
      
      var activeMembers = this.getActiveMembers();
      if (activeMembers.length === 0) return 0;
      
      var headers = attendanceSheet.getRange(1, 1, 1, attendanceSheet.getLastColumn()).getValues()[0];
      var totalAttendance = 0;
      var dateCount = 0;
      
      // 해당 월의 날짜 열 찾기
      for (var j = 3; j < headers.length; j++) {
        if (headers[j] && headers[j] instanceof Date && headers[j].getMonth() + 1 === month) {
          dateCount++;
          var columnData = attendanceSheet.getRange(2, j + 1, attendanceSheet.getLastRow() - 1, 1).getValues().flat();
          var dayAttendance = columnData.filter(function(val) { return val === 1 || val === '1'; }).length;
          totalAttendance += dayAttendance;
        }
      }
      
      if (dateCount === 0) return 0;
      return Math.round((totalAttendance / (activeMembers.length * dateCount)) * 100);
    } catch (e) {
      Logger.log('getMonthlyAttendanceRate error: ' + e.toString());
      return 0;
    }
  },

  /**
   * 최근 6개월간의 출석 추이를 반환합니다 (그래프용).
   * @returns {Object} {labels: [], data: []}
   */
  getAttendanceTrend: function() {
    try {
      var labels = [];
      var data = [];
      var currentDate = new Date();
      
      // 최근 6개월 데이터 수집
      for (var i = 5; i >= 0; i--) {
        var targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        var monthName = (targetDate.getMonth() + 1) + '월';
        labels.push(monthName);
        
        var rate = this.getMonthlyAttendanceRate(targetDate.getMonth() + 1);
        data.push(rate);
      }
      
      return { labels: labels, data: data };
    } catch (e) {
      Logger.log('getAttendanceTrend error: ' + e.toString());
      // 오류 시 더미 데이터 반환
      return {
        labels: ['9월', '10월', '11월', '12월', '1월', '2월'],
        data: [0, 0, 0, 0, 0, 0]
      };
    }
  }
};
