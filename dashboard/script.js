// Google Apps Script Web App URL
// 배포 후 생성된 URL을 여기에 입력하세요.
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxDXCHn6sityjqJbUdi4EhWfzA1yjAhjl-xgBBti7d6iMW_wb1zlVTJG1iK0d9TKB_Vgw/exec';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    fetchSummary();
});

let sessionToken = localStorage.getItem('sessionToken');
let currentMembers = []; // 회원 목록 캐시

function initAuth() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const saveEvalBtn = document.getElementById('save-evaluation-btn');
    const viewEvalBtn = document.getElementById('view-evaluation-btn');
    const importVoteBtn = document.getElementById('import-vote-btn');
    const generateTeamsBtn = document.getElementById('generate-teams-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (saveEvalBtn) {
        saveEvalBtn.addEventListener('click', handleSaveEvaluation);
    }
    if (viewEvalBtn) {
        viewEvalBtn.addEventListener('click', handleViewEvaluation);
    }
    if (importVoteBtn) {
        importVoteBtn.addEventListener('click', handleImportVote);
    }
    if (generateTeamsBtn) {
        generateTeamsBtn.addEventListener('click', handleGenerateTeams);
    }

    if (sessionToken) {
        showMemberSection();
        fetchMembers();
        fetchStats(); // 통계 데이터 가져오기 ✅
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username, password })
        });
        const result = await response.json();

        if (result.success) {
            sessionToken = result.token;
            localStorage.setItem('sessionToken', sessionToken);
            showMemberSection();
            fetchMembers();
            fetchStats(); // 로그인 후 통계 로드 ✅
        } else {
            alert('로그인 실패: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
    }
}

function handleLogout() {
    localStorage.removeItem('sessionToken');
    sessionToken = null;
    hideMemberSection();
}

function showMemberSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('member-section').style.display = 'block';
    document.getElementById('evaluation-section').style.display = 'block';
    document.getElementById('band-vote-section').style.display = 'block';
    document.getElementById('team-balancing-section').style.display = 'block';
}

function hideMemberSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('member-section').style.display = 'none';
    document.getElementById('evaluation-section').style.display = 'none';
    document.getElementById('band-vote-section').style.display = 'none';
    document.getElementById('team-balancing-section').style.display = 'none';
}

async function fetchSummary() {
    try {
        const response = await fetch(`${GAS_API_URL}?action=getSummary`);
        const json = await response.json();
        if (json.status === 'success') {
            document.getElementById('total-members').textContent = json.data.totalMembers + '명';
        }
    } catch (error) {
        console.error('Error fetching summary:', error);
    }
}

// 출석 통계 가져오기 ✅
async function fetchStats() {
    try {
        const response = await fetch(`${GAS_API_URL}?action=getStats&token=${sessionToken}`);
        const json = await response.json();
        if (json.status === 'success') {
            document.getElementById('avg-attendance').textContent = json.data.avgRate + '%';
            renderChart(json.data.trend);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// 그래프 렌더링 ✅
function renderChart(trendData) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [{
                label: '출석률 (%)',
                data: trendData.data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
}

async function fetchMembers() {
    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = '<tr><td colspan="5" class="loading">데이터를 불러오는 중...</td></tr>';

    try {
        const response = await fetch(`${GAS_API_URL}?action=getMembers&token=${sessionToken}`);
        const json = await response.json();

        if (json.status === 'success') {
            renderMembers(json.data);
        } else if (json.code === 'UNAUTHORIZED') {
            handleLogout();
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error('Error fetching members:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="loading" style="color: red;">오류: ${error.message}</td></tr>`;
    }
}

function renderMembers(members) {
    const tableHeader = document.querySelector('#members-table thead tr');
    // 테이블 헤더에 '직급' 추가 (이미 추가되어 있지 않다면)
    if (tableHeader.cells.length < 5) {
        const th = document.createElement('th');
        th.textContent = '직급';
        tableHeader.insertBefore(th, tableHeader.cells[1]);
    }

    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = '';

    members.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;">${member.name}</td>
            <td><span class="rank-badge">${member.rank || '일반'}</span></td>
            <td>${member.number || '-'}</td>
            <td>${member.mainPos || '-'}</td>
            <td><span class="status-badge status-${getStatusClass(member.status)}">${member.status}</span></td>
        `;
        tableBody.appendChild(tr);
    });

    // 평가 폼의 선수 목록도 업데이트
    updateEvaluationMemberList(members);
}

function getStatusClass(status) {
    if (status === '활동') return 'active';
    if (status === '휴면') return 'dormant';
    if (status === '탈퇴') return 'withdrawn';
    return 'unknown';
}

// ==========================================
// 경기 평가 기능
// ==========================================

function updateEvaluationMemberList(members) {
    currentMembers = members;
    const evalMemberSelect = document.getElementById('eval-member');
    const viewMemberSelect = document.getElementById('view-member');

    // 기존 옵션 제거 (첫 번째 옵션 제외)
    evalMemberSelect.innerHTML = '<option value="">선수를 선택하세요</option>';
    viewMemberSelect.innerHTML = '<option value="">선수를 선택하세요</option>';

    // 활동 중인 회원만 추가
    members.filter(m => m.status === '활동').forEach(member => {
        const option1 = document.createElement('option');
        option1.value = member.id;
        option1.textContent = `${member.name} (${member.mainPos || '-'})`;
        option1.dataset.name = member.name;
        evalMemberSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = member.id;
        option2.textContent = `${member.name} (${member.mainPos || '-'})`;
        option2.dataset.name = member.name;
        viewMemberSelect.appendChild(option2);
    });
}

async function handleSaveEvaluation() {
    const date = document.getElementById('eval-date').value;
    const memberSelect = document.getElementById('eval-member');
    const memberId = memberSelect.value;
    const memberName = memberSelect.options[memberSelect.selectedIndex]?.dataset.name;

    if (!date || !memberId) {
        alert('경기 날짜와 선수를 선택해주세요.');
        return;
    }

    const evaluationData = {
        action: 'saveEvaluation',
        token: sessionToken,
        date: date,
        memberId: memberId,
        memberName: memberName,
        attack: parseInt(document.getElementById('metric-attack').value),
        defense: parseInt(document.getElementById('metric-defense').value),
        pass: parseInt(document.getElementById('metric-pass').value),
        teamwork: parseInt(document.getElementById('metric-teamwork').value),
        stamina: parseInt(document.getElementById('metric-stamina').value),
        mentality: parseInt(document.getElementById('metric-mentality').value),
        skill: parseInt(document.getElementById('metric-skill').value),
        tactics: parseInt(document.getElementById('metric-tactics').value)
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(evaluationData)
        });
        const result = await response.json();

        if (result.success) {
            alert('평가가 저장되었습니다!');
            // 입력 폼 초기화
            document.querySelectorAll('.metric-item select').forEach(select => select.value = "5");
        } else {
            alert('저장 실패: ' + result.message);
        }
    } catch (error) {
        console.error('Save evaluation error:', error);
        alert('평가 저장 중 오류가 발생했습니다.');
    }
}

async function handleViewEvaluation() {
    const memberSelect = document.getElementById('view-member');
    const memberId = memberSelect.value;
    const memberName = memberSelect.options[memberSelect.selectedIndex]?.textContent;

    if (!memberId) {
        alert('선수를 선택해주세요.');
        return;
    }

    try {
        const response = await fetch(`${GAS_API_URL}?action=getEvaluation&token=${sessionToken}&memberId=${memberId}`);
        const json = await response.json();

        if (json.status === 'success') {
            renderRadarChart(json.data, memberName);
            document.querySelector('.radar-chart-container').style.display = 'block';
        } else {
            alert('조회 실패: ' + json.message);
        }
    } catch (error) {
        console.error('View evaluation error:', error);
        alert('평가 조회 중 오류가 발생했습니다.');
    }
}

let radarChartInstance = null;

function renderRadarChart(data, memberName) {
    const ctx = document.getElementById('radarChart').getContext('2d');

    // 기존 차트 제거
    if (radarChartInstance) {
        radarChartInstance.destroy();
    }

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['공격력', '수비력', '패스능력', '팀워크', '체력', '정신력', '기술', '전술이해도'],
            datasets: [{
                label: memberName || '선수 평가',
                data: [
                    data.attack, data.defense, data.pass, data.teamwork,
                    data.stamina, data.mentality, data.skill, data.tactics
                ],
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(52, 152, 219, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 2
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    // 통계 정보 표시
    const statsDiv = document.getElementById('evaluation-stats');
    statsDiv.innerHTML = `
        <p><strong>종합 점수:</strong> ${data.totalScore} / 10</p>
        <p><strong>평가 횟수:</strong> ${data.evaluationCount}회</p>
        <p style="font-size: 0.85em; color: #7f8c8d; margin-top: 10px;">
            * 평균 점수는 모든 평가의 평균값입니다.
        </p>
    `;
}

async function handleImportVote() {
    const date = document.getElementById('vote-date').value;
    const rawText = document.getElementById('vote-text').value;
    const resultMsg = document.getElementById('vote-result-msg');

    if (!date || !rawText) {
        alert('경기 날짜와 명단 텍스트를 입력해주세요.');
        return;
    }

    resultMsg.innerHTML = '⏳ 처리 중...';
    resultMsg.style.color = '#3498db';

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'markAttendanceFromVote',
                token: sessionToken,
                date: date,
                rawText: rawText
            })
        });
        const result = await response.json();

        if (result.success) {
            let msg = `✅ 성공: ${result.updatedCount}명 처리 완료`;
            if (result.notFound && result.notFound.length > 0) {
                msg += `<br>⚠️ 미등록 명단: <span style="color: #e74c3c;">${result.notFound.join(', ')}</span>`;
            }
            resultMsg.innerHTML = msg;
            resultMsg.style.color = '#27ae60';
            // 텍스트 영역 비우기
            document.getElementById('vote-text').value = '';
            // 목록 새로고침
            fetchMembers();
        } else {
            resultMsg.innerHTML = '❌ 오류: ' + result.message;
            resultMsg.style.color = '#e74c3c';
        }
    } catch (error) {
        console.error('Import vote error:', error);
        resultMsg.innerHTML = '❌ 네트워크 오류가 발생했습니다.';
        resultMsg.style.color = '#e74c3c';
    }
}

// ==========================================
// 팀 밸런싱 기능
// ==========================================

async function handleGenerateTeams() {
    const date = document.getElementById('balance-date').value;
    const teamCount = parseInt(document.getElementById('team-count').value);
    const mode = document.getElementById('balance-mode').value;
    const container = document.getElementById('teams-container');

    if (!date) {
        alert('경기 날짜를 선택해주세요.');
        return;
    }

    container.innerHTML = '<div class="loading">⏳ 팀 배정 구성 중...</div>';
    container.style.display = 'grid';

    try {
        // 서버에서 상세 데이터(평가 점수 포함) 가져오기
        const response = await fetch(`${GAS_API_URL}?action=getAttendeesWithScores&token=${sessionToken}&date=${date}`);
        const json = await response.json();

        if (json.status !== 'success') {
            throw new Error(json.message);
        }

        const players = json.data;
        if (players.length === 0) {
            container.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; color: #e74c3c;">해당 날짜에 참석자가 없습니다.</div>';
            return;
        }

        // 팀 나누기 로직 실행 (서버 TeamModule.balanceAndDistribute와 동일한 로직을 클라이언트에서도 수행)
        const teams = divideTeams(players, teamCount, mode);
        renderTeams(teams);

    } catch (error) {
        console.error('Generate teams error:', error);
        container.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center; color: #e74c3c;">오류 발생: ${error.message}</div>`;
    }
}

/**
 * 클라이언트 측 팀 분배 로직 (스네이크 드래프트)
 */
function divideTeams(players, teamCount, mode) {
    if (mode === 'random') {
        // 셔플
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
    } else {
        // 밸런스 모드: 점수 기반 정렬
        players.sort((a, b) => {
            const valB = (b.totalScore || 5) + (b.rank === '회장' || b.rank === '감독' ? 1 : 0);
            const valA = (a.totalScore || 5) + (a.rank === '회장' || a.rank === '감독' ? 1 : 0);
            return valB - valA;
        });
    }

    const teams = Array.from({ length: teamCount }, () => []);
    players.forEach((player, index) => {
        let teamIndex;
        if (mode === 'random') {
            teamIndex = index % teamCount;
        } else {
            // 스네이크 드래프트
            const round = Math.floor(index / teamCount);
            teamIndex = (round % 2 === 0) ? (index % teamCount) : (teamCount - 1 - (index % teamCount));
        }
        teams[teamIndex].push(player);
    });

    return teams;
}

function renderTeams(teams) {
    const container = document.getElementById('teams-container');
    container.innerHTML = '';

    teams.forEach((team, i) => {
        const teamCard = document.createElement('div');
        teamCard.className = `team-card team-${i}`;

        const teamName = String.fromCharCode(65 + i); // A, B, C, D
        const teamTotalScore = team.reduce((sum, p) => sum + (p.totalScore || 5), 0);
        const avgScore = (teamTotalScore / team.length).toFixed(1);

        teamCard.innerHTML = `
            <h4>
                <span>${teamName}팀 (${team.length}명)</span>
                <span class="player-score" style="color: #555; font-size: 0.8em;">평균 ${avgScore}점</span>
            </h4>
            <ul class="player-list">
                ${team.map(p => `
                    <li class="player-item">
                        <div class="player-info">
                            <span style="font-weight: 500;">${p.name}</span>
                            <span class="player-pos">${p.mainPos || '-'}</span>
                        </div>
                        <span class="player-score">${p.totalScore || '5.0'}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        container.appendChild(teamCard);
    });
}
