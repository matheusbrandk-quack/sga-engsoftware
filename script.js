// ==========================================
// DADOS MOCADOS E CONFIGURAÇÃO
// ==========================================

const defaultProfessores = [{
    id: 1, 
    nome: "Ana Paula Menezes", 
    email: "professor@maisunifacisa.com.br", 
    senha: "12345678", 
    disciplina: "Engenharia de Software", 
    foto: null
}];

const defaultTurmas = [
    { id: 101, disciplina: "Engenharia de Software", periodo: "ADS 2026.2", professorId: 1, arquivos: [] },
    { id: 102, disciplina: "Estrutura de Dados", periodo: "ADS 2026.2", professorId: 1, arquivos: [] }
];

function gerarAlunos() {
    let list = [];
    for (let i = 0; i < 20; i++) {
        list.push({
            matricula: `202610${i+10}`, nome: `Aluno Teste ${i+1}`, turmaId: 101,
            p1: 0, p2: 0, proj1: 0, proj2: 0, notaFinal: null
        });
    }
    return list;
}

// Simulando banco de dados no LocalStorage
function loadDB(key, fallback) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
}

let professores = loadDB('sga_prof', defaultProfessores);
let turmas = loadDB('sga_turmas', defaultTurmas);
let alunos = loadDB('sga_alunos', null);
if (!alunos || alunos.length === 0) alunos = gerarAlunos();

let loggedUser = loadDB('sga_session', null);
let selectedTurmaId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 5;

function saveDB() {
    localStorage.setItem('sga_prof', JSON.stringify(professores));
    localStorage.setItem('sga_turmas', JSON.stringify(turmas));
    localStorage.setItem('sga_alunos', JSON.stringify(alunos));
    localStorage.setItem('sga_session', JSON.stringify(loggedUser));
}

// ==========================================
// REGRAS DE NEGÓCIO - SECÇÃO 7
// ==========================================

function calcularSituacao(aluno) {
    const ind = ((parseFloat(aluno.p1)||0) + (parseFloat(aluno.p2)||0)) / 2;
    const proj = ((parseFloat(aluno.proj1)||0) + (parseFloat(aluno.proj2)||0)) / 2;
    const media = (0.4 * ind) + (0.6 * proj);
    
    let status = "";
    if (media >= 7.0) {
        status = "Aprovado";
    } else if (media < 7.0 && proj < 4.0) {
        status = "Reprovado";
    } else if (media < 7.0 && proj >= 4.0) {
        status = "Fará prova final";
    }

    if (status === "Fará prova final" && aluno.notaFinal !== null && aluno.notaFinal !== "") {
        if ((proj + parseFloat(aluno.notaFinal)) >= 7.0) {
            status = "Aprovado";
        } else {
            status = "Reprovado";
        }
    }
    return { media: media.toFixed(1), status, proj };
}

// ==========================================
// INTERFACE E RENDERIZAÇÃO
// ==========================================

function navigate(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchView(viewId) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(viewId === 'view-turmas') document.getElementById('nav-turmas').classList.add('active');
    if(viewId === 'view-perfil') document.getElementById('nav-perfil').classList.add('active');
}

function updateUI() {
    if (!loggedUser) return;
    const avatarTxt = loggedUser.nome.substring(0, 2).toUpperCase();
    const bgImage = loggedUser.foto ? `url(${loggedUser.foto})` : 'none';
    
    document.querySelectorAll('.avatar, .avatar-large').forEach(el => {
        el.innerText = loggedUser.foto ? '' : avatarTxt;
        el.style.backgroundImage = bgImage;
    });

    document.getElementById('prof-name').value = loggedUser.nome;
    document.getElementById('prof-email').value = loggedUser.email;
    document.getElementById('prof-subject').value = loggedUser.disciplina;
}

function renderTurmas() {
    const grid = document.getElementById('turmas-grid');
    grid.innerHTML = '';
    const minhas = turmas.filter(t => t.professorId === loggedUser.id);
    
    const coresDisciplinas = {
        "Engenharia de Software": "#186FD9",
        "Banco de Dados II": "#279E5B",
        "Programação Web": "#F0A019",
        "Estrutura de Dados": "#E63946"
    };
    
    minhas.forEach(t => {
        const qtd = alunos.filter(a => a.turmaId === t.id).length;
        const corTopo = coresDisciplinas[t.disciplina] || "#186FD9";
        
        grid.innerHTML += `
            <article class="card-turma" style="border-top-color: ${corTopo};">
                <h3>${t.disciplina}</h3>
                <p>${t.periodo}<br><br>${qtd} alunos matriculados</p>
                <br>
                <button class="btn btn-link" onclick="abrirTurma(${t.id})">Abrir turma →</button>
            </article>`;
    });
}

function abrirTurma(id) {
    selectedTurmaId = id;
    currentPage = 1;
    const turma = turmas.find(t => t.id === id);
    if (turma) {
        document.getElementById('turma-titulo').innerText = turma.disciplina;
        const qtd = alunos.filter(a => a.turmaId === id).length;
        document.getElementById('turma-subtitulo').innerText = `${turma.periodo} - ${qtd} alunos matriculados`;
    }
    switchView('view-tabela');
    renderTabela();
    renderArquivos();
}

function renderTabela() {
    const tbody = document.getElementById('table-body-alunos');
    tbody.innerHTML = '';
    const turmaAlunos = alunos.filter(a => a.turmaId === selectedTurmaId);
    
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = turmaAlunos.slice(start, start + ITEMS_PER_PAGE);
    
    paginated.forEach(a => {
        const calc = calcularSituacao(a);
        let badgeClass = calc.status === 'Aprovado' ? 'bg-success' : calc.status === 'Reprovado' ? 'bg-danger' : 'bg-warning';
        let finalInput = calc.status !== 'Fará prova final' && a.notaFinal === null ? 'disabled' : '';

        tbody.innerHTML += `
            <tr>
                <td>${a.matricula}</td>
                <td><strong>${a.nome}</strong></td>
                <td><input type="number" min="0" max="10" step="0.1" value="${a.p1 !== null && a.p1 !== undefined ? a.p1 : ''}" onchange="salvarNota('${a.matricula}', 'p1', this.value)"></td>
                <td><input type="number" min="0" max="10" step="0.1" value="${a.p2 !== null && a.p2 !== undefined ? a.p2 : ''}" onchange="salvarNota('${a.matricula}', 'p2', this.value)"></td>
                <td><input type="number" min="0" max="10" step="0.1" value="${a.proj1 !== null && a.proj1 !== undefined ? a.proj1 : ''}" onchange="salvarNota('${a.matricula}', 'proj1', this.value)"></td>
                <td><input type="number" min="0" max="10" step="0.1" value="${a.proj2 !== null && a.proj2 !== undefined ? a.proj2 : ''}" onchange="salvarNota('${a.matricula}', 'proj2', this.value)"></td>
                <td><strong>${calc.media}</strong></td>
                <td><span class="status-badge ${badgeClass}">${calc.status}</span></td>
                <td><input type="number" min="0" max="10" step="0.1" value="${a.notaFinal !== null && a.notaFinal !== undefined ? a.notaFinal : ''}" ${finalInput} onchange="salvarNota('${a.matricula}', 'notaFinal', this.value)"></td>
            </tr>`;
    });
    
    const totalPages = Math.ceil(turmaAlunos.length / ITEMS_PER_PAGE) || 1;
    document.getElementById('pagination-info').innerText = `Página ${currentPage} de ${totalPages} (Total: ${turmaAlunos.length} alunos)`;
}

// ==========================================
// TRATAMENTO E VALIDAÇÃO DE NOTAS
// ==========================================

window.salvarNota = function(mat, campo, valor) {
    const aluno = alunos.find(a => a.matricula === mat);
    if (!aluno) return;

    // Tratamento de campo em branco
    if (valor === '' || valor === null) {
        aluno[campo] = null;
    } else {
        let num = parseFloat(valor);

        // Tratamento de valor inválido (não numérico)
        if (isNaN(num)) {
            alert('Por favor, insira um valor numérico válido.');
            renderTabela();
            return;
        }

        // Validação de intervalo de 0 a 10
        if (num < 0 || num > 10) {
            alert('A nota deve estar compreendida entre 0 e 10.');
            num = Math.max(0, Math.min(10, num)); // Limita (clamp) ao intervalo válido
        }

        aluno[campo] = num;
    }

    saveDB();
    renderTabela();
};

// ==========================================
// GESTÃO DE ARQUIVOS PDF DA DISCIPLINA
// ==========================================

function renderArquivos() {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;
    filesList.innerHTML = '';

    const turma = turmas.find(t => t.id === selectedTurmaId);
    if (!turma || !turma.arquivos || turma.arquivos.length === 0) {
        filesList.innerHTML = `<p class="text-muted" style="font-size: 14px; padding: 12px 0;">Nenhum arquivo PDF anexado a esta disciplina ainda.</p>`;
        return;
    }

    turma.arquivos.forEach(arq => {
        filesList.innerHTML += `
            <div class="file-item">
                <div class="file-info">
                    <span class="file-icon">📄</span>
                    <div>
                        <strong>${arq.nome}</strong>
                        <small>Enviado em ${arq.data}</small>
                    </div>
                </div>
                <div class="file-actions">
                    <a href="${arq.dados}" target="_blank" class="btn btn-secondary btn-sm" title="Abrir PDF em nova aba">Abrir</a>
                    <a href="${arq.dados}" download="${arq.nome}" class="btn btn-primary btn-sm" title="Baixar PDF">Baixar</a>
                    <button type="button" class="btn btn-link text-danger" onclick="removerArquivo(${arq.id})" title="Excluir arquivo">Excluir</button>
                </div>
            </div>`;
    });
}

window.removerArquivo = function(fileId) {
    if (!confirm('Tem certeza que deseja remover este arquivo PDF?')) return;
    const turma = turmas.find(t => t.id === selectedTurmaId);
    if (!turma || !turma.arquivos) return;
    turma.arquivos = turma.arquivos.filter(f => f.id !== fileId);
    saveDB();
    renderArquivos();
};

// ==========================================
// EVENTOS E LOGIN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (loggedUser) { navigate('screen-home'); updateUI(); renderTurmas(); }

    document.getElementById('form-login').onsubmit = (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email').value.trim().toLowerCase();
        const passInput = document.getElementById('login-password').value;
        
        if (emailInput === "professor@maisunifacisa.com.br" && passInput === "12345678") {
            let prof = professores.find(p => p.email === emailInput);
            if (!prof) {
                prof = { id: 1, nome: "Ana Paula Menezes", email: emailInput, senha: passInput, disciplina: "Engenharia de Software", foto: null };
                professores.push(prof);
            } else {
                prof.senha = passInput;
            }
            loggedUser = prof;
            saveDB();
            updateUI();
            renderTurmas();
            navigate('screen-home');
            return;
        }

        const user = professores.find(p => p.email === emailInput && p.senha === passInput);
        if (user) { 
            loggedUser = user; 
            saveDB(); 
            updateUI(); 
            renderTurmas(); 
            navigate('screen-home'); 
        } else { 
            alert('Credenciais inválidas!'); 
        }
    };

    document.getElementById('form-register').onsubmit = (e) => {
        e.preventDefault();
        const user = {
            id: Date.now(),
            nome: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value.trim().toLowerCase(),
            disciplina: document.getElementById('reg-subject').value,
            senha: document.getElementById('reg-password').value,
            foto: null
        };
        professores.push(user); 
        loggedUser = user; 
        saveDB(); 
        updateUI(); 
        renderTurmas(); 
        navigate('screen-home');
    };

    document.getElementById('btn-logout').onclick = () => { loggedUser = null; saveDB(); navigate('screen-login'); };
    document.getElementById('nav-turmas').onclick = () => switchView('view-turmas');
    document.getElementById('nav-perfil').onclick = () => switchView('view-perfil');
    document.getElementById('btn-voltar-turmas').onclick = () => switchView('view-turmas');
    document.getElementById('link-to-register').onclick = () => navigate('screen-register');
    document.getElementById('link-to-login').onclick = () => navigate('screen-login');

    document.getElementById('btn-prev-page').onclick = () => { if(currentPage > 1) { currentPage--; renderTabela(); }};
    document.getElementById('btn-next-page').onclick = () => { 
        const turmaAlunos = alunos.filter(a => a.turmaId === selectedTurmaId);
        const maxPage = Math.ceil(turmaAlunos.length / ITEMS_PER_PAGE);
        if(currentPage < maxPage) { currentPage++; renderTabela(); }
    };

    // Upload de Arquivo PDF
    const inputPdf = document.getElementById('input-upload-pdf');
    if (inputPdf) {
        inputPdf.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                    alert('Por favor, selecione apenas arquivos em formato PDF.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const turma = turmas.find(t => t.id === selectedTurmaId);
                    if (!turma) return;
                    if (!turma.arquivos) turma.arquivos = [];
                    
                    const now = new Date();
                    const dataFormatada = now.toLocaleDateString('pt-PT', { 
                        day: '2-digit', month: '2-digit', year: 'numeric' 
                    }) + ' às ' + now.toLocaleTimeString('pt-PT', { 
                        hour: '2-digit', minute: '2-digit' 
                    });

                    turma.arquivos.push({
                        id: Date.now(),
                        nome: file.name,
                        data: dataFormatada,
                        dados: evt.target.result
                    });

                    saveDB();
                    renderArquivos();
                    inputPdf.value = '';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Upload de Imagem (Base64) - Perfil
    document.getElementById('input-upload-photo').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                loggedUser.foto = evt.target.result;
                const idx = professores.findIndex(p => p.id === loggedUser.id);
                if (idx !== -1) professores[idx] = loggedUser;
                saveDB(); 
                updateUI();
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('btn-remove-photo').onclick = () => {
        loggedUser.foto = null;
        const idx = professores.findIndex(p => p.id === loggedUser.id);
        if (idx !== -1) professores[idx] = loggedUser;
        saveDB();
        updateUI();
    };
});