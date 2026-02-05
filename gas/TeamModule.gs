/**
 * 팀 밸런싱 모듈
 * 포지션과 실력 점수를 기반으로 균형 잡힌 팀을 구성합니다.
 */

/**
 * 참석자 명단을 받아 두 팀으로 균형있게 배정합니다.
 * @param {Array<string>} memberIds 참석 회원 ID 배열
 * @returns {Object} {teamA: [...], teamB: [...], analysis: {...}}
 */
function balanceTeams(memberIds) {
  try {
    // 1. 회원 정보 조회
    var members = getMemberDetails(memberIds);
    
    if (members.length < 2) {
      throw new Error('최소 2명 이상의 참석자가 필요합니다.');
    }

    // 2. 포지션별 그룹화
    var positionGroups = groupByPosition(members);
    
    // 3. 1차 배정: 포지션 기반 균등 분배
    var initialTeams = distributeByPosition(positionGroups);
    
    // 4. 2차 최적화: 실력 점수 밸런싱
    var balancedTeams = optimizeBySkill(initialTeams);
    
    // 5. 결과 분석
    var analysis = analyzeTeams(balancedTeams);
    
    return {
      teamA: balancedTeams.teamA,
      teamB: balancedTeams.teamB,
      analysis: analysis
    };
    
  } catch (error) {
    console.error('팀 밸런싱 오류: ' + error.toString());
    EmailModule.sendErrorAlert(error, 'balanceTeams');
    throw error;
  }
}

/**
 * 회원 ID 배열로부터 상세 정보를 조회합니다.
 * @param {Array<string>} memberIds 
 * @returns {Array<Object>} [{id, name, position, subPosition, skillScore}, ...]
 */
function getMemberDetails(memberIds) {
  var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
  var lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return [];
  
  var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  var members = [];
  
  data.forEach(function(row) {
    var id = row[0]; // A열: 회원번호
    
    if (memberIds.indexOf(id) !== -1) {
      members.push({
        id: id,
        name: row[1],           // B열: 성명
        department: row[2],     // C열: 소속
        number: row[3],         // D열: 등번호
        position: row[4],       // E열: 주 포지션
        subPosition: row[5],    // F열: 선호 포지션
        foot: row[6],           // G열: 주발
        skillScore: getSkillScore(id) || 50 // 기본값 50점
      });
    }
  });
  
  return members;
}

/**
 * 회원의 실력 점수를 조회합니다.
 * (향후 피드백 기반 시스템으로 확장 가능)
 * @param {string} memberId 
 * @returns {number} 실력 점수 (0-100)
 */
function getSkillScore(memberId) {
  // TODO: 실력 점수 시트에서 조회하는 로직 추가
  // 현재는 기본값 50 반환
  return 50;
}

/**
 * 회원들을 포지션별로 그룹화합니다.
 * @param {Array<Object>} members 
 * @returns {Object} {GK: [...], DF: [...], MF: [...], FW: [...]}
 */
function groupByPosition(members) {
  var groups = {
    GK: [],
    DF: [],
    MF: [],
    FW: []
  };
  
  members.forEach(function(member) {
    var pos = member.position || 'MF'; // 기본값 MF
    if (groups[pos]) {
      groups[pos].push(member);
    } else {
      groups['MF'].push(member); // 알 수 없는 포지션은 MF로
    }
  });
  
  return groups;
}

/**
 * 1차 배정: 포지션별로 교대로 배치하여 균등 분배
 * @param {Object} positionGroups 
 * @returns {Object} {teamA: [...], teamB: [...]}
 */
function distributeByPosition(positionGroups) {
  var teamA = [];
  var teamB = [];
  
  // 각 포지션별로 실력 순 정렬 (내림차순)
  Object.keys(positionGroups).forEach(function(pos) {
    positionGroups[pos].sort(function(a, b) {
      return b.skillScore - a.skillScore;
    });
  });
  
  // 포지션 순서: GK -> DF -> MF -> FW
  var posOrder = ['GK', 'DF', 'MF', 'FW'];
  
  posOrder.forEach(function(pos) {
    var members = positionGroups[pos];
    
    // 지그재그 배치 (1등->A, 2등->B, 3등->A, 4등->B...)
    members.forEach(function(member, idx) {
      if (idx % 2 === 0) {
        teamA.push(member);
      } else {
        teamB.push(member);
      }
    });
  });
  
  return {teamA: teamA, teamB: teamB};
}

/**
 * 2차 최적화: 실력 점수 총합이 비슷하도록 교환
 * @param {Object} teams {teamA, teamB}
 * @returns {Object} 최적화된 {teamA, teamB}
 */
function optimizeBySkill(teams) {
  var teamA = teams.teamA.slice(); // 복사
  var teamB = teams.teamB.slice();
  
  var maxIterations = 100; // 무한루프 방지
  var iteration = 0;
  var improved = true;
  
  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;
    
    var scoreA = calculateTotalScore(teamA);
    var scoreB = calculateTotalScore(teamB);
    var currentDiff = Math.abs(scoreA - scoreB);
    
    // 모든 가능한 교환 시도
    for (var i = 0; i < teamA.length; i++) {
      for (var j = 0; j < teamB.length; j++) {
        // 같은 포지션끼리만 교환 (포지션 밸런스 유지)
        if (teamA[i].position === teamB[j].position) {
          
          // 임시 교환
          var tempA = teamA.slice();
          var tempB = teamB.slice();
          var temp = tempA[i];
          tempA[i] = tempB[j];
          tempB[j] = temp;
          
          // 교환 후 점수 차이 계산
          var newScoreA = calculateTotalScore(tempA);
          var newScoreB = calculateTotalScore(tempB);
          var newDiff = Math.abs(newScoreA - newScoreB);
          
          // 개선되었으면 적용
          if (newDiff < currentDiff) {
            teamA = tempA;
            teamB = tempB;
            currentDiff = newDiff;
            improved = true;
          }
        }
      }
    }
  }
  
  return {teamA: teamA, teamB: teamB};
}

/**
 * 팀의 총 실력 점수를 계산합니다.
 * @param {Array<Object>} team 
 * @returns {number} 총점
 */
function calculateTotalScore(team) {
  return team.reduce(function(sum, member) {
    return sum + (member.skillScore || 50);
  }, 0);
}

/**
 * 팀 구성을 분석하여 통계를 반환합니다.
 * @param {Object} teams {teamA, teamB}
 * @returns {Object} 분석 결과
 */
function analyzeTeams(teams) {
  var teamA = teams.teamA;
  var teamB = teams.teamB;
  
  var scoreA = calculateTotalScore(teamA);
  var scoreB = calculateTotalScore(teamB);
  
  var posCountA = countPositions(teamA);
  var posCountB = countPositions(teamB);
  
  return {
    teamACount: teamA.length,
    teamBCount: teamB.length,
    teamAScore: scoreA,
    teamBScore: scoreB,
    scoreDifference: Math.abs(scoreA - scoreB),
    teamAPositions: posCountA,
    teamBPositions: posCountB,
    balanced: Math.abs(scoreA - scoreB) <= 10 // 10점 이내면 균형 잡힌 것으로 판단
  };
}

/**
 * 팀의 포지션별 인원수를 계산합니다.
 * @param {Array<Object>} team 
 * @returns {Object} {GK: n, DF: n, MF: n, FW: n}
 */
function countPositions(team) {
  var count = {GK: 0, DF: 0, MF: 0, FW: 0};
  
  team.forEach(function(member) {
    var pos = member.position || 'MF';
    if (count[pos] !== undefined) {
      count[pos]++;
    }
  });
  
  return count;
}

/**
 * 팀 배정 결과를 보기 좋게 출력합니다.
 * @param {Object} result balanceTeams() 반환값
 * @returns {string} 포맷팅된 결과 문자열
 */
function formatTeamResult(result) {
  var output = [];
  
  output.push('=== 팀 배정 결과 ===\n');
  
  // Team A
  output.push('【Team A】 (' + result.teamA.length + '명, 총점: ' + result.analysis.teamAScore + ')');
  result.teamA.forEach(function(m) {
    output.push('  ' + m.position + ' | ' + m.number + '번 ' + m.name + ' (' + m.skillScore + '점)');
  });
  
  output.push('');
  
  // Team B
  output.push('【Team B】 (' + result.teamB.length + '명, 총점: ' + result.analysis.teamBScore + ')');
  result.teamB.forEach(function(m) {
    output.push('  ' + m.position + ' | ' + m.number + '번 ' + m.name + ' (' + m.skillScore + '점)');
  });
  
  output.push('');
  output.push('점수 차이: ' + result.analysis.scoreDifference + '점');
  output.push('밸런스: ' + (result.analysis.balanced ? '✅ 양호' : '⚠️ 불균형'));
  
  return output.join('\n');
}
