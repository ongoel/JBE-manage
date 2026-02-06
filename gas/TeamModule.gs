/**
 * 팀 밸런싱 및 배정 모듈
 */

var TeamModule = {
  /**
   * 팀 나누기 알고리즘
   * @param {Array} members 참석자 리스트 (id, name, rank, pos, score 포함)
   * @param {number} teamCount 나눌 팀 수 (기본 2-4)
   * @param {string} mode 'random', 'balanced'
   * @returns {Array} 배정된 팀 리스트 [[TeamA], [TeamB]...]
   */
  generateTeams: function(members, teamCount, mode) {
    if (!members || members.length === 0) return [];
    
    // 복사본 생성
    var players = JSON.parse(JSON.stringify(members));
    
    if (mode === 'random') {
      return this.shuffleAndDistribute(players, teamCount);
    } else {
      return this.balanceAndDistribute(players, teamCount);
    }
  },

  /**
   * 단순 셔플 분배
   */
  shuffleAndDistribute: function(players, teamCount) {
    // 피셔-예이츠 셔플
    for (var i = players.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = players[i];
      players[i] = players[j];
      players[j] = temp;
    }
    
    var teams = Array.from({ length: teamCount }, () => []);
    players.forEach((player, index) => {
      teams[index % teamCount].push(player);
    });
    
    return teams;
  },

  /**
   * 실력 및 포지션 기반 밸런스 분배
   */
  balanceAndDistribute: function(players, teamCount) {
    // 1. 플레이어 가치 산정 (평균 점수 + 직급 가산점)
    players.forEach(p => {
      var rankBonus = this.getRankValue(p.rank);
      p.value = (p.totalScore || 5) + rankBonus; // 기본값 5점
    });

    // 2. 가치 순정렬 (내림차순)
    players.sort((a, b) => b.value - a.value);

    // 3. 스네이크 드래프트 방식으로 분배
    var teams = Array.from({ length: teamCount }, () => []);
    var teamValues = new Array(teamCount).fill(0);

    players.forEach((player, index) => {
      // 현재 가장 가치 합계가 낮은 팀 또는 순서대로 배정 (스네이크)
      var round = Math.floor(index / teamCount);
      var teamIndex;
      
      if (round % 2 === 0) {
        teamIndex = index % teamCount;
      } else {
        teamIndex = (teamCount - 1) - (index % teamCount);
      }
      
      teams[teamIndex].push(player);
      teamValues[teamIndex] += player.value;
    });

    return teams;
  },

  /**
   * 직급별 가중치 (밸런스 도정용)
   */
  getRankValue: function(rank) {
    // 필요시 조정
    switch(rank) {
      case '명예회원': return 1.5;
      case '회장': return 1.0;
      case '감독': return 1.0;
      default: return 0;
    }
  },

  /**
   * 특정 날짜의 참석자 정보를 강화(평가 점수 포함)해서 가져옵니다.
   */
  getAttendeesWithScores: function(dateStr) {
    var gameDate = new Date(dateStr);
    var attendees = EvaluationModule.getAttendees(gameDate);
    
    return attendees.map(member => {
      var scores = EvaluationModule.getMemberAverageScores(member.id);
      // '회원명단'에서 상세 정보(직급, 포지션) 가져오기
      var detail = this.getMemberDetail(member.id);
      
      return {
        id: member.id,
        name: member.name,
        rank: detail.rank,
        mainPos: detail.mainPos,
        totalScore: scores.totalScore
      };
    });
  },

  getMemberDetail: function(memberId) {
    var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == memberId) {
        return {
          rank: data[i][2],
          mainPos: data[i][5]
        };
      }
    }
    return { rank: '일반', mainPos: '미정' };
  }
};
