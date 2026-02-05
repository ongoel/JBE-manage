// Google Apps Script Web App URL
// 배포 후 생성된 URL을 여기에 입력하세요.
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxDXCHn6sityjqJbUdi4EhWfzA1yjAhjl-xgBBti7d6iMW_wb1zlVTJG1iK0d9TKB_Vgw/exec';

document.addEventListener('DOMContentLoaded', () => {
    fetchMembers();
});

async function fetchMembers() {
    const tableBody = document.querySelector('#members-table tbody');

    try {
        let members = [];

        if (!GAS_API_URL) {
            console.warn('GAS_API_URL is not set. Using mock data.');
            await new Promise(resolve => setTimeout(resolve, 800));
            members = getMockMembers();
        } else {
            const response = await fetch(`${GAS_API_URL}?action=getMembers`);
            const json = await response.json();

            if (json.status === 'success') {
                members = json.data;
            } else {
                throw new Error(json.message || 'Failed to fetch members');
            }
        }

        renderMembers(members);
        updateSummary(members);

    } catch (error) {
        console.error('Error fetching members:', error);
        tableBody.innerHTML = `<tr><td colspan="10" class="loading" style="color: red;">데이터를 불러오는 중 오류가 발생했습니다: ${error.message}</td></tr>`;
    }
}

function renderMembers(members) {
    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = '';

    if (members.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="loading">등록된 회원이 없습니다.</td></tr>';
        return;
    }

    members.forEach(member => {
        const tr = document.createElement('tr');
        // v1.4.0 구조: 번호|성명|직급|소속기관|등번호|주포|선호|주발|상태|가입일
        tr.innerHTML = `
            <td>${member.id}</td>
            <td style="font-weight:bold;">${member.name}</td>
            <td>${member.rank || '-'}</td>
            <td>${member.org || '-'}</td>
            <td>${member.number || '-'}</td>
            <td>${member.mainPos || '-'}</td>
            <td>${member.subPos || '-'}</td>
            <td>${member.foot || '-'}</td>
            <td><span class="status-badge status-${getStatusClass(member.status)}">${member.status}</span></td>
            <td>${member.joinDate || '-'}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function getStatusClass(status) {
    if (status === '활동') return 'active';
    if (status === '휴면') return 'dormant';
    if (status === '장기휴면') return 'long-term';
    if (status === '탈퇴') return 'withdrawn';
    return 'unknown';
}

function updateSummary(members) {
    const totalMembersElement = document.getElementById('total-members');
    if (totalMembersElement) {
        totalMembersElement.textContent = members.length + '명';
    }
}

function getMockMembers() {
    return [
        { id: 'M001', name: '홍길동', rank: '주장', org: '서울지부', number: 10, mainPos: 'FW', subPos: 'MF', foot: 'R', status: '활동', joinDate: '2023-01-01' },
        { id: 'M002', name: '김철수', rank: '회원', org: '경기지부', number: 7, mainPos: 'MF', subPos: 'DF', foot: 'L', status: '휴면', joinDate: '2023-02-15' }
    ];
}
