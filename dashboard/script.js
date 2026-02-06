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
}

function hideMemberSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('member-section').style.display = 'none';
    document.getElementById('evaluation-section').style.display = 'none';
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
            document.querySelectorAll('.metric-item input').forEach(input => input.value = 5);
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
