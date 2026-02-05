/**
 * JBE 매니저 테스트 스크립트
 * GAS 스크립트 편집기에서 실행하여 각 모듈의 주요 기능을 테스트합니다.
 */

/**
 * 전체 테스트 실행
 */
function runAllTests() {
  console.log('========== JBE 매니저 테스트 시작 ==========');
  
  var results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // 1. 설정 및 유틸리티 테스트
  testConfig(results);
  testUtils(results);
  
  // 2. 회원 관리 테스트
  testMemberModule(results);
  
  // 3. 출석 관리 테스트
  testAttendanceModule(results);
  
  // 4. 팀 밸런싱 테스트
  testTeamModule(results);
  
  // 5. 밴드 포스팅 테스트 (실제 API 호출 X)
  testNotifyModule(results);
  
  // 6. 아카이브 모듈 테스트
  testArchiveModule(results);
  
  // 7. 검증 모듈 테스트
  testValidator(results);
  
  // 결과 출력
  console.log('\n========== 테스트 결과 ==========');
  console.log('통과: ' + results.passed + '개');
  console.log('실패: ' + results.failed + '개');
  
  if (results.errors.length > 0) {
    console.log('\n실패한 테스트:');
    results.errors.forEach(function(err) {
      console.log('- ' + err);
    });
  }
  
  console.log('========== 테스트 종료 ==========');
}

function testConfig(results) {
  console.log('\n[Config 테스트]');
  try {
    assert(Config.PROJECT_NAME === 'JBE 매니저', 'Project name check');
    assert(Config.SHEETS.REGISTRY === '등록부', 'Sheet name check');
    assert(Config.POSITIONS.GK === 'GK', 'Position constant check');
    results.passed += 3;
  } catch (e) {
    results.failed++;
    results.errors.push('Config: ' + e.message);
  }
}

function testUtils(results) {
  console.log('\n[Utils 테스트]');
  try {
    // 날짜 포맷 테스트
    var date = new Date(2026, 0, 15); // 2026-01-15
    var formatted = Utils.formatDate(date);
    assert(formatted === '2026-01-15', 'Date formatting');
    results.passed++;
    
    // 회원 ID 생성 테스트
    var sheet = Utils.getSheetByName(Config.SHEETS.REGISTRY);
    if (sheet) {
      var id = Utils.generateMemberId(sheet);
      assert(id.startsWith('M'), 'Member ID generation');
      results.passed++;
    } else {
      results.failed++;
      results.errors.push('Utils: 등록부 시트를 찾을 수 없습니다');
    }
  } catch (e) {
    results.failed++;
    results.errors.push('Utils: ' + e.message);
  }
}

function testMemberModule(results) {
  console.log('\n[MemberModule 테스트]');
  try {
    // 등번호 중복 확인 테스트
    var isDuplicate = checkDuplicateNumber(999); // 존재하지 않을 번호
    assert(isDuplicate === false, 'Duplicate number check (non-existent)');
    results.passed++;
    
    // 사용 가능한 등번호 추천 테스트
    var suggested = suggestAvailableNumber();
    assert(suggested !== null && suggested >= 1 && suggested <= 99, 'Number suggestion');
    results.passed++;
  } catch (e) {
    results.failed++;
    results.errors.push('MemberModule: ' + e.message);
  }
}

function testAttendanceModule(results) {
  console.log('\n[AttendanceModule 테스트]');
  try {
    // 밴드 텍스트 파싱 테스트
    var testText = '참석 (3명)\n1. 홍길동\n2. 김철수\n3. 이영희';
    var attendees = parseAttendanceFromBand(testText);
    assert(attendees.length === 3, 'Band text parsing - count');
    assert(attendees.indexOf('홍길동') !== -1, 'Band text parsing - name check');
    results.passed += 2;
    
    // 랭킹 계산 테스트 (현재 월)
    var month = new Date().getMonth() + 1;
    var ranking = calculateRanking(month, month);
    assert(Array.isArray(ranking), 'Ranking calculation returns array');
    results.passed++;
  } catch (e) {
    results.failed++;
    results.errors.push('AttendanceModule: ' + e.message);
  }
}

function testTeamModule(results) {
  console.log('\n[TeamModule 테스트]');
  try {
    // 빈 배열 테스트
    try {
      balanceTeams([]);
      results.failed++;
      results.errors.push('TeamModule: 빈 배열 예외 처리 실패');
    } catch (err) {
      assert(err.message.includes('최소 2명'), 'Empty array error handling');
      results.passed++;
    }
    
    // 포지션 그룹화 테스트
    var mockMembers = [
      {id: 'M001', position: 'FW', skillScore: 70},
      {id: 'M002', position: 'MF', skillScore: 65},
      {id: 'M003', position: 'GK', skillScore: 80}
    ];
    var groups = groupByPosition(mockMembers);
    assert(groups.FW.length === 1, 'Position grouping - FW');
    assert(groups.MF.length === 1, 'Position grouping - MF');
    assert(groups.GK.length === 1, 'Position grouping - GK');
    results.passed += 3;
  } catch (e) {
    results.failed++;
    results.errors.push('TeamModule: ' + e.message);
  }
}

function testNotifyModule(results) {
  console.log('\n[NotifyModule 테스트]');
  try {
    // API 설정 확인 (실제 호출하지 않음)
    var hasToken = Config.BAND.ACCESS_TOKEN !== 'YOUR_ACCESS_TOKEN';
    console.log('밴드 API 토큰 설정 여부: ' + (hasToken ? '설정됨' : '미설정'));
    results.passed++;
  } catch (e) {
    results.failed++;
    results.errors.push('NotifyModule: ' + e.message);
  }
}

function testArchiveModule(results) {
  console.log('\n[ArchiveModule 테스트]');
  try {
    // 연도 전환 검증 테스트
    var validation = Validator.validateTransition();
    assert(typeof validation.isValid === 'boolean', 'Transition validation check');
    results.passed++;
  } catch (e) {
    results.failed++;
    results.errors.push('ArchiveModule: ' + e.message);
  }
}

function testValidator(results) {
  console.log('\n[Validator 테스트]');
  try {
    // 등번호 중복 확인
    var check = Validator.checkDuplicateBackNumber(999);
    assert(typeof check === 'boolean', 'Validator returns boolean');
    results.passed++;
  } catch (e) {
    results.failed++;
    results.errors.push('Validator: ' + e.message);
  }
}

/**
 * 간단한 assertion 함수
 */
function assert(condition, testName) {
  if (!condition) {
    throw new Error('테스트 실패: ' + testName);
  }
  console.log('✓ ' + testName);
}

/**
 * 개별 모듈 테스트 함수들
 */

// 회원 등록 시뮬레이션 테스트 (실제 데이터 추가하지 않음)
function testMemberRegistration() {
  console.log('\n[회원 등록 시뮬레이션 테스트]');
  
  var mockData = {
    name: '테스트회원',
    department: '테스트팀',
    backNumber: 99,
    mainPos: 'MF',
    subPos: 'FW',
    foot: 'R'
  };
  
  console.log('테스트 회원 데이터:', JSON.stringify(mockData));
  
  // 등번호 중복 확인
  if (checkDuplicateNumber(mockData.backNumber)) {
    console.log('⚠️ 등번호 ' + mockData.backNumber + '는 이미 사용 중입니다.');
  } else {
    console.log('✓ 등번호 사용 가능');
  }
  
  console.log('(실제 등록은 수행하지 않음)');
}

// 출석 체크 시뮬레이션 테스트
function testAttendanceMarking() {
  console.log('\n[출석 체크 시뮬레이션 테스트]');
  
  var testDate = new Date();
  var testNames = ['홍길동', '김철수'];
  
  console.log('테스트 날짜:', Utils.formatDate(testDate));
  console.log('참석자:', testNames.join(', '));
  console.log('(실제 출석 체크는 수행하지 않음)');
}

// 팀 밸런싱 시뮬레이션 테스트
function testTeamBalancing() {
  console.log('\n[팀 밸런싱 시뮬레이션 테스트]');
  
  var mockIds = ['M001', 'M002', 'M003', 'M004', 'M005', 'M006'];
  
  try {
    var result = balanceTeams(mockIds);
    console.log('Team A:', result.teamA.length + '명');
    console.log('Team B:', result.teamB.length + '명');
    console.log('점수 차이:', result.analysis.scoreDifference);
    console.log('밸런스:', result.analysis.balanced ? '양호' : '불균형');
  } catch (e) {
    console.log('오류:', e.message);
  }
}
