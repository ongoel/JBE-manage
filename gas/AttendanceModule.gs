/**
 * 출석 관리 모듈
 * 밴드 투표 텍스트 파싱 및 출석 체크 로직
 */

/**
 * 밴드에서 복사한 투표 텍스트를 파싱하여 참석자 명단을 추출합니다.
 * @param {string} text 밴드 투표 복사 텍스트
 * @returns {Array<string>} 참석자 이름 배열
 */
/**
 * 밴드에서 복사한 투표 텍스트를 파싱하여 참석자 명단을 추출합니다.
 * 다양한 밴드 투표 복사 형식(번호 목록, 불렛, 괄호 포함 등)을 처리합니다.
 * @param {string} text 밴드 투표 복사 텍스트
 * @returns {Array<string>} 참석자 이름 배열
 */
function parseAttendanceFromBand(text) {
  var lines = text.split('\n');
  var attendees = [];
  
  // 제외할 키워드 (헤더 등)
  var excludeKeywords = ['참석', '불참', '미정', '투표', '명', '멤버'];

  lines.forEach(function(line) {
    line = line.trim();
    if (!line) return;

    // 1. 헤더/메타데이터 라인 제외
    var isHeader = excludeKeywords.some(keyword => line.includes(keyword) && line.length < 15);
    if (isHeader && !line.match(/[가-힣]{2,}/)) return; // "참석자 명단" 같은 건 제외, 하지만 이름에 포함될 수도 있으니 주의

    // 2. 다양한 패턴 매칭
    // Case A: "1. 홍길동" 또는 "1) 홍길동"
    var matchNumber = line.match(/^\d+[\.\)]\s*([가-힣a-zA-Z\s]+)/);
    
    // Case B: "- 홍길동" 또는 "* 홍길동"
    var matchBullet = line.match(/^[\-\*•]\s*([가-힣a-zA-Z\s]+)/);

    // Case C: "홍길동 (부서명)" 또는 "홍길동/부서명"
    // 괄호나 슬래시 앞까지만 이름으로 인식
    var cleanLine = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[\-\*•]\s*/, ''); // 앞부분 제거
    var matchNameOnly = cleanLine.split(/[\(\/\-]/)[0].trim();

    var name = '';
    if (matchNumber) name = matchNumber[1].trim();
    else if (matchBullet) name = matchBullet[1].trim();
    else if (matchNameOnly.length >= 2 && matchNameOnly.length < 10) name = matchNameOnly;

    // 3. 유효성 검증 및 추가
    if (name && name.length >= 2) {
      // 괄호나 특수문자 추가 제거
      name = name.replace(/[0-9]/g, '').trim(); 
      attendees.push(name);
    }
  });

  return attendees;
}

/**
 * 특정 날짜에 참석자들의 출석을 체크합니다.
 * @param {Date} date 경기 날짜
 * @param {Array<string>} names 참석자 이름 배열
 */
function markAttendance(date, names) {
  var sheetName = Utils.getCurrentYearAttendanceSheetName();
  var sheet = Utils.getSheetByName(sheetName);
  
  if (!sheet) {
    console.error('출석부 시트가 없습니다: ' + sheetName);
    return;
  }

  // 1. 해당 날짜 열 찾기 또는 생성
  var dateStr = Utils.formatDate(date);
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var dateColIndex = -1;

  for (var i = 0; i < headerRow.length; i++) {
    // 날짜 객체 또는 문자열 비교
    var cellValue = headerRow[i];
    var cellDateStr = (cellValue instanceof Date) ? Utils.formatDate(cellValue) : cellValue;
    
    if (cellDateStr === dateStr) {
      dateColIndex = i + 1;
      break;
    }
  }

  // 날짜 열이 없으면 새로 추가
  if (dateColIndex === -1) {
    dateColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, dateColIndex).setValue(dateStr); // 날짜 입력
    console.log('새로운 날짜 열 추가됨: ' + dateStr);
  }

  // 2. 이름으로 회원 행 찾기
  // 출석부 B열이 이름이라고 가정 (스키마 참조)
  // 동명이인 처리: 이름이 같으면 모두 체크하거나 경고 로그
  var memberNames = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
  
  names.forEach(function(name) {
    var found = false;
    for (var i = 0; i < memberNames.length; i++) {
      if (memberNames[i] === name) {
        var row = i + 2; // 데이터 시작행(2) + 인덱스
        sheet.getRange(row, dateColIndex).setValue(1);
        found = true;
      }
    }
    
    if (!found) {
      console.warn('출석부에서 이름을 찾을 수 없음: ' + name);
    } else {
      // 동명이인 체크: memberNames에서 해당 이름이 2개 이상인지 확인
      var count = memberNames.filter(n => n === name).length;
      if (count > 1) {
        console.warn('동명이인 경고: "' + name + '" 회원이 ' + count + '명 있습니다. 모두 출석 처리되었습니다.');
      }
    }
  });
  
  console.log('출석 체크 완료: ' + dateStr + ', ' + names.length + '명');
}

/**
 * 월별 또는 분기별 출석 랭킹을 계산합니다.
 * @param {number} startMonth 시작 월 (1~12)
 * @param {number} endMonth 종료 월 (1~12)
 * @returns {Array<Object>} 랭킹 데이터 배열 [{id, name, count, rank}]
 */
function calculateRanking(startMonth, endMonth) {
  var sheet = Utils.getSheetByName(Utils.getCurrentYearAttendanceSheetName());
  if (!sheet) return [];

  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // 날짜 열 인덱스 식별
  var dateIndices = [];
  header.forEach(function(val, idx) {
    if (idx < 4) return; // A~D는 정보 열
    var d = new Date(val);
    if (!isNaN(d.getTime())) {
      var m = d.getMonth() + 1;
      if (m >= startMonth && m <= endMonth) {
        dateIndices.push(idx);
      }
    }
  });

  if (dateIndices.length === 0) return [];

  // 데이터 가져오기
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  var stats = [];

  data.forEach(function(row) {
    var id = row[0];
    var name = row[1];
    var count = 0;
    
    dateIndices.forEach(function(colIdx) {
      if (row[colIdx] == 1) count++;
    });

    if (count > 0) {
      stats.push({id: id, name: name, count: count});
    }
  });

  // 정렬 (출석수 내림차순)
  stats.sort(function(a, b) {
    return b.count - a.count;
  });

  // 순위 매기기
  var rank = 1;
  for (var i = 0; i < stats.length; i++) {
    if (i > 0 && stats[i].count < stats[i-1].count) {
      rank = i + 1;
    }
    stats[i].rank = rank;
  }

  return stats;
}
