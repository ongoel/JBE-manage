/**
 * 경기 평가 모듈
 * 경기 후 선수 평가 데이터 입력 및 조회를 담당합니다.
 */

var EvaluationModule = {
  /**
   * 평가 지표 정의 (8가지)
   */
  METRICS: {
    ATTACK: '공격력',
    DEFENSE: '수비력',
    PASS: '패스능력',
    TEAMWORK: '팀워크',
    STAMINA: '체력',
    MENTALITY: '정신력',
    SKILL: '기술',
    TACTICS: '전술이해도'
  },

  /**
   * 경기평가 시트 초기화
   * 시트가 없으면 생성하고 헤더를 설정합니다.
   */
  initEvaluationSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = '경기평가';
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = [
        '평가일자', '회원번호', '성명',
        this.METRICS.ATTACK, this.METRICS.DEFENSE, this.METRICS.PASS, this.METRICS.TEAMWORK,
        this.METRICS.STAMINA, this.METRICS.MENTALITY, this.METRICS.SKILL, this.METRICS.TACTICS,
        '종합점수', '평가자'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4a86e8').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    return sheet;
  },

  /**
   * 현재 참석자 명단 가져오기
   * @param {Date} gameDate 경기 날짜
   * @returns {Array} 참석자 정보 배열
   */
  getAttendees: function(gameDate) {
    try {
      var attendanceSheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
      if (!attendanceSheet) return [];
      
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
      
      if (dateColumnIndex === -1) return [];
      
      var attendees = [];
      var lastRow = attendanceSheet.getLastRow();
      
      for (var row = 2; row <= lastRow; row++) {
        var attendance = attendanceSheet.getRange(row, dateColumnIndex).getValue();
        if (attendance === 1 || attendance === '1') {
          var memberId = attendanceSheet.getRange(row, 1).getValue();
          var memberName = attendanceSheet.getRange(row, 2).getValue();
          attendees.push({ id: memberId, name: memberName });
        }
      }
      
      return attendees;
    } catch (e) {
      Logger.log('getAttendees error: ' + e.toString());
      return [];
    }
  },

  /**
   * 평가 데이터 저장
   * @param {Object} evaluationData 평가 데이터
   * @returns {Object} 결과
   */
  saveEvaluation: function(evaluationData) {
    try {
      var sheet = this.initEvaluationSheet();
      var date = evaluationData.date || new Date();
      var evaluator = evaluationData.evaluator || 'SYSTEM';
      
      // 종합점수 계산 (8개 지표의 평균)
      var totalScore = (
        evaluationData.attack + evaluationData.defense + evaluationData.pass + evaluationData.teamwork +
        evaluationData.stamina + evaluationData.mentality + evaluationData.skill + evaluationData.tactics
      ) / 8;
      
      var rowData = [
        Utils.formatDate(date),
        evaluationData.memberId,
        evaluationData.memberName,
        evaluationData.attack,
        evaluationData.defense,
        evaluationData.pass,
        evaluationData.teamwork,
        evaluationData.stamina,
        evaluationData.mentality,
        evaluationData.skill,
        evaluationData.tactics,
        Math.round(totalScore * 10) / 10, // 소수점 1자리
        evaluator
      ];
      
      sheet.appendRow(rowData);
      
      return { success: true, message: '평가가 저장되었습니다.' };
    } catch (e) {
      Logger.log('saveEvaluation error: ' + e.toString());
      return { success: false, message: '저장 중 오류가 발생했습니다: ' + e.toString() };
    }
  },

  /**
   * 특정 회원의 평가 이력 조회
   * @param {string} memberId 회원 ID
   * @returns {Array} 평가 이력
   */
  getMemberEvaluations: function(memberId) {
    try {
      var sheet = this.initEvaluationSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return [];
      
      var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
      var evaluations = [];
      
      for (var i = 0; i < data.length; i++) {
        if (data[i][1] === memberId) {
          evaluations.push({
            date: data[i][0],
            memberId: data[i][1],
            memberName: data[i][2],
            attack: data[i][3],
            defense: data[i][4],
            pass: data[i][5],
            teamwork: data[i][6],
            stamina: data[i][7],
            mentality: data[i][8],
            skill: data[i][9],
            tactics: data[i][10],
            totalScore: data[i][11],
            evaluator: data[i][12]
          });
        }
      }
      
      return evaluations;
    } catch (e) {
      Logger.log('getMemberEvaluations error: ' + e.toString());
      return [];
    }
  },

  /**
   * 회원의 평균 평가 점수 계산 (레이더 차트용)
   * @param {string} memberId 회원 ID
   * @returns {Object} 평균 점수
   */
  getMemberAverageScores: function(memberId) {
    try {
      var evaluations = this.getMemberEvaluations(memberId);
      if (evaluations.length === 0) {
        return {
          attack: 0, defense: 0, pass: 0, teamwork: 0,
          stamina: 0, mentality: 0, skill: 0, tactics: 0,
          totalScore: 0, evaluationCount: 0
        };
      }
      
      var sum = {
        attack: 0, defense: 0, pass: 0, teamwork: 0,
        stamina: 0, mentality: 0, skill: 0, tactics: 0
      };
      
      evaluations.forEach(function(eval) {
        sum.attack += eval.attack;
        sum.defense += eval.defense;
        sum.pass += eval.pass;
        sum.teamwork += eval.teamwork;
        sum.stamina += eval.stamina;
        sum.mentality += eval.mentality;
        sum.skill += eval.skill;
        sum.tactics += eval.tactics;
      });
      
      var count = evaluations.length;
      
      return {
        attack: Math.round((sum.attack / count) * 10) / 10,
        defense: Math.round((sum.defense / count) * 10) / 10,
        pass: Math.round((sum.pass / count) * 10) / 10,
        teamwork: Math.round((sum.teamwork / count) * 10) / 10,
        stamina: Math.round((sum.stamina / count) * 10) / 10,
        mentality: Math.round((sum.mentality / count) * 10) / 10,
        skill: Math.round((sum.skill / count) * 10) / 10,
        tactics: Math.round((sum.tactics / count) * 10) / 10,
        totalScore: Math.round(((sum.attack + sum.defense + sum.pass + sum.teamwork + sum.stamina + sum.mentality + sum.skill + sum.tactics) / (count * 8)) * 10) / 10,
        evaluationCount: count
      };
    } catch (e) {
      Logger.log('getMemberAverageScores error: ' + e.toString());
      return { attack: 0, defense: 0, pass: 0, teamwork: 0, stamina: 0, mentality: 0, skill: 0, tactics: 0, totalScore: 0, evaluationCount: 0 };
    }
  }
};
