import { supabase } from "./supabase.js";

// ── Форм элементүүд ──────────────────────────────────────────
const transactionForm = document.getElementById('transaction-form');
const txTypeInput     = document.getElementById('tx-type');
const txCategoryInput = document.getElementById('tx-category');
const txAmountInput   = document.getElementById('tx-amount');
const txDateInput     = document.getElementById('tx-date');
const txDescInput     = document.getElementById('tx-desc');

// ═══════════════════════════════════════════════════════════════
// BADGE ТОХИРГОО
// ═══════════════════════════════════════════════════════════════

const MAIN_BADGES = [
    {
        name:   'Анхны бүртгэл',
        icon:   'fa-solid fa-seedling',
        color:  '#22c55e',
        bg:     '#f0fdf4',
        border: '#86efac',
        desc:   'Эхний гүйлгээгээ бүртгэх',
    },
    {
        name:   'Идэвхтэй хэрэглэгч',
        icon:   'fa-solid fa-fire-flame-curved',
        color:  '#f97316',
        bg:     '#fff7ed',
        border: '#fdba74',
        desc:   '3 өөр өдөр гүйлгээ бүртгэх',
    },
    {
        name:   'Тогтмол бүртгэгч',
        icon:   'fa-solid fa-calendar-check',
        color:  '#3b82f6',
        bg:     '#eff6ff',
        border: '#93c5fd',
        desc:   '7 өөр өдөр гүйлгээ бүртгэх',
    },
    {
        name:   'Нягт бүртгэгч',
        icon:   'fa-solid fa-database',
        color:  '#8b5cf6',
        bg:     '#f5f3ff',
        border: '#c4b5fd',
        desc:   '30 өөр өдөр гүйлгээ бүртгэх',
    },
    {
        name:   'Шилдэг хэрэглэгч',
        icon:   'fa-solid fa-crown',
        color:  '#f59e0b',
        bg:     '#fffbeb',
        border: '#fcd34d',
        desc:   '30 өдөр дараалан гүйлгээ бүртгэх',
    },
];

const MONTHLY_BADGES = [
    {
        name:   'Ашигтай сар',
        icon:   'fa-solid fa-arrow-trend-up',
        color:  '#10b981',
        bg:     'linear-gradient(135deg, #064e3b, #065f46)',
        border: '#34d399',
        desc:   'Орлого нь зарлагаасаа илүү сар',
    },
    {
        name:   'Алдагдалтай сар',
        icon:   'fa-solid fa-arrow-trend-down',
        color:  '#f43f5e',
        bg:     'linear-gradient(135deg, #4c0519, #881337)',
        border: '#fb7185',
        desc:   'Зарлага нь орлогоосоо давсан сар',
    },
];

// ── Сарын эхлэл, төгсгөлийг тооцоолох туслах функц ──────────
function getMonthRange(monthYear) {
    const [year, month] = monthYear.split('-').map(Number);
    const startDate = `${monthYear}-01`;
    const nextMonth = month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, '0')}`;
    const endDate = `${nextMonth}-01`;
    return { startDate, endDate };
}

// ═══════════════════════════════════════════════════════════════
// ГҮЙЛГЭЭ НЭМЭХ
// ═══════════════════════════════════════════════════════════════

transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type        = txTypeInput.value;
    const category    = txCategoryInput.value;
    const amount      = parseFloat(txAmountInput.value);
    const date        = txDateInput.value;
    const description = txDescInput.value;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        alert("Сешн дууссан байна. Дахин нэвтрэнэ үү!");
        window.location.href = 'index.html';
        return;
    }

    // Зөвхөн зарлага бол төсөв шалгана
    if (type === 'expense') {
        const currentMonthYear = date.substring(0, 7);
        const { startDate, endDate } = getMonthRange(currentMonthYear);

        const { data: budgetData } = await supabase
            .from('budgets')
            .select('limit_amount')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('month_year', currentMonthYear)
            .maybeSingle();

        if (budgetData) {
            const { data: pastExpenses } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .eq('category', category)
                .gte('date', startDate)
                .lt('date', endDate);   // ← lte биш lt, -31 биш

            let totalPastExpense = 0;
            if (pastExpenses) {
                pastExpenses.forEach(tx => { totalPastExpense += tx.amount; });
            }

            const projectedTotal = totalPastExpense + amount;
            const limit          = budgetData.limit_amount;

            if (projectedTotal > limit) {
                const overBy  = (projectedTotal - limit).toLocaleString();
                const proceed = confirm(
                    `ТӨСӨВ ХЭТРЭХ ГЭЖ БАЙНА.\n\n` +
                    `Ангилал: ${category}\n` +
                    `Сар: ${currentMonthYear}\n` +
                    `Төсвийн хязгаар: ${limit.toLocaleString()} ₮\n` +
                    `Өмнөх зарлага: ${totalPastExpense.toLocaleString()} ₮\n` +
                    `Шинэ зарлага: ${amount.toLocaleString()} ₮\n` +
                    `Хэтрэх дүн: ${overBy} ₮\n\n` +
                    `Үргэлжлүүлэх үү?`
                );
                if (!proceed) return;
            }
        }
    }

    const { error } = await supabase
        .from('transactions')
        .insert([{ user_id: user.id, type, category, amount, date, description }])
        .select();

    if (error) {
        alert("Гүйлгээг хадгалахад алдаа гарлаа: " + error.message);
    } else {
        transactionForm.reset();
        fetchTransactions();
    }
});

// ═══════════════════════════════════════════════════════════════
// ГҮЙЛГЭЭ ТАТАХ & ДҮН ТООЦООЛОХ
// ═══════════════════════════════════════════════════════════════

async function fetchTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) { console.error("Гүйлгээ уншихад алдаа:", error.message); return; }

    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(tx => {
        if (tx.type === 'income')       totalIncome  += tx.amount;
        else if (tx.type === 'expense') totalExpense += tx.amount;
    });

    document.getElementById('total-balance').textContent = `${(totalIncome - totalExpense).toLocaleString()} ₮`;
    document.getElementById('total-income').textContent  = `${totalIncome.toLocaleString()} ₮`;
    document.getElementById('total-expense').textContent = `${totalExpense.toLocaleString()} ₮`;

    renderTransactions(transactions);
    checkAndAwardBadges(transactions);
}

// ═══════════════════════════════════════════════════════════════
// ГҮЙЛГЭЭ ХҮСНЭГТЭД ХАРУУЛАХ
// ═══════════════════════════════════════════════════════════════

function renderTransactions(transactions) {
    const listContainer = document.getElementById('transaction-list');

    if (transactions.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>
                    Одоогоор ямар нэгэн гүйлгээ бүртгэгдээгүй байна.
                </td>
            </tr>`;
        return;
    }

    listContainer.innerHTML = transactions.map(tx => {
        const isIncome = tx.type === 'income';
        return `
            <tr>
                <td>${tx.date}</td>
                <td><span class="badge bg-light text-dark shadow-sm border">${tx.category}</span></td>
                <td class="text-secondary fw-medium">${tx.description}</td>
                <td><span class="badge ${isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">${isIncome ? 'Орлого' : 'Зарлага'}</span></td>
                <td class="text-end fw-bold ${isIncome ? 'text-success' : 'text-danger'}">${isIncome ? '+' : '-'}${tx.amount.toLocaleString()} ₮</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteTransaction('${tx.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// ГҮЙЛГЭЭ УСТГАХ
// ═══════════════════════════════════════════════════════════════

window.deleteTransaction = async function(id) {
    if (!confirm("Та энэ гүйлгээг устгахдаа итгэлтэй байна уу?")) return;
    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        alert("Гүйлгээ амжилттай устгагдлаа.");
        fetchTransactions();
    } catch (error) {
        alert("Гүйлгээ устгахад алдаа гарлаа: " + error.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// ГАРАХ ТОВЧ
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-logout').addEventListener('click', async () => {
    if (!confirm("Та системээс гарахдаа итгэлтэй байна уу?")) return;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        alert("Системээс гарахад алдаа гарлаа: " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════════
// ХУУДАС АЧААЛАХ
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { window.location.href = 'index.html'; return; }

    document.getElementById('user-email').textContent = user.email;

    await fetchTransactions();
    await fetchBudgets();
    await renderBadges();
});

// ═══════════════════════════════════════════════════════════════
// ТӨСӨВ ЛОГИК
// ═══════════════════════════════════════════════════════════════

const budgetForm          = document.getElementById('budget-form');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetAmountInput   = document.getElementById('budget-amount');
const budgetMonthInput    = document.getElementById('budget-month');

budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const category    = budgetCategoryInput.value;
    const limitAmount = parseFloat(budgetAmountInput.value);
    const monthYear   = budgetMonthInput.value;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Сешн дууссан байна!"); return; }

    const { error } = await supabase
        .from('budgets')
        .insert([{ user_id: user.id, category, limit_amount: limitAmount, month_year: monthYear }]);

    if (error) {
        alert("Төсөв тогтооход алдаа гарлаа: " + error.message);
    } else {
        alert(`${monthYear} сарын ${category} ангилалд төсөв амжилттай тогтоогдлоо!`);
        budgetForm.reset();
        const instance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasBudget'));
        if (instance) instance.hide();
        fetchBudgets();
        checkAndAwardBadges();
    }
});

// ── Төсвүүдийг татаж, зарцуулалт + progress харуулах ─────────
async function fetchBudgets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('month_year', { ascending: false });

    if (error) { console.error("Төсөв уншихад алдаа:", error.message); return; }

    const container = document.getElementById('current-budgets-list');

    if (!budgets || budgets.length === 0) {
        container.innerHTML = `
            <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
            <div class="text-center py-3 text-muted small bg-light rounded">Одоогоор төсөв тогтоогоогүй байна.</div>`;
        return;
    }

    // Бүх зарлагуудыг нэг удаа татна
    const { data: allExpenses } = await supabase
        .from('transactions')
        .select('amount, category, date')
        .eq('user_id', user.id)
        .eq('type', 'expense');

    const budgetRows = budgets.map(b => {
        const { startDate, endDate } = getMonthRange(b.month_year);

        // JS дотор сар + ангилалаар шүүнэ
        const spent = (allExpenses || [])
            .filter(t =>
                t.category === b.category &&
                t.date >= startDate &&
                t.date <  endDate
            )
            .reduce((sum, t) => sum + t.amount, 0);

        const limit     = b.limit_amount;
        const remaining = limit - spent;
        const percent   = Math.min(Math.round((spent / limit) * 100), 100);

        const barColor = percent >= 100 ? 'bg-danger'
                       : percent >= 75  ? 'bg-warning'
                       : 'bg-success';

        const remainText = remaining >= 0
            ? `<span class="text-success fw-bold">${remaining.toLocaleString()} ₮ үлдсэн</span>`
            : `<span class="text-danger fw-bold">${Math.abs(remaining).toLocaleString()} ₮ хэтэрсэн</span>`;

        return `
            <div class="card p-3 mb-2 bg-light border-0 shadow-sm">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="fw-bold small text-dark">${b.category}</span>
                        <span class="text-muted mx-1">•</span>
                        <span class="small text-secondary">${b.month_year}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold text-primary small">${limit.toLocaleString()} ₮</span>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteBudget('${b.id}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                <div class="progress mb-1" style="height: 6px; border-radius: 4px;">
                    <div class="progress-bar ${barColor}"
                         role="progressbar"
                         style="width: ${percent}%">
                    </div>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span class="text-muted" style="font-size:0.72rem;">
                        Зарцуулсан: <strong>${spent.toLocaleString()} ₮</strong> (${percent}%)
                    </span>
                    <span style="font-size:0.72rem;">${remainText}</span>
                </div>
            </div>`;
    });

    container.innerHTML = `
        <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
        ${budgetRows.join('')}`;
}

// ── Төсөв устгах ─────────────────────────────────────────────
window.deleteBudget = async function(id) {
    if (!confirm("Энэ төсвийг устгахдаа итгэлтэй байна уу?")) return;
    try {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        if (error) throw error;
        alert("Төсөв амжилттай устгагдлаа.");
        fetchBudgets();
    } catch (error) {
        alert("Төсөв устгахад алдаа гарлаа: " + error.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// BADGE СИСТЕМ
// ═══════════════════════════════════════════════════════════════

function calcStreak(transactions) {
    if (!transactions || transactions.length === 0) return 0;

    const days = Array.from(new Set(transactions.map(t => t.date))).sort().reverse();
    if (days.length === 0) return 0;

    let streak = 1, maxStreak = 1;
    let current = new Date(days[0]);

    for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i]);
        const diff = (current - prev) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
            streak++;
            if (streak > maxStreak) maxStreak = streak;
        } else if (diff > 1) {
            streak = 1;
        }
        current = prev;
    }
    return maxStreak;
}

async function checkAndAwardBadges(txs) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!txs) {
        const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id);
        txs = data || [];
    }

    const { data: existingBadges } = await supabase
        .from('badges').select('badge_name').eq('user_id', user.id);

    const earned     = new Set((existingBadges || []).map(b => b.badge_name));
    const toAward    = [];
    const uniqueDays = new Set(txs.map(t => t.date)).size;

    if (!earned.has('Анхны бүртгэл')      && txs.length >= 1)        toAward.push('Анхны бүртгэл');
    if (!earned.has('Идэвхтэй хэрэглэгч') && uniqueDays >= 3)        toAward.push('Идэвхтэй хэрэглэгч');
    if (!earned.has('Тогтмол бүртгэгч')   && uniqueDays >= 7)        toAward.push('Тогтмол бүртгэгч');
    if (!earned.has('Нягт бүртгэгч')      && uniqueDays >= 30)       toAward.push('Нягт бүртгэгч');
    if (!earned.has('Шилдэг хэрэглэгч')   && calcStreak(txs) >= 30) toAward.push('Шилдэг хэрэглэгч');

    // Сарын дүгнэлт — DB-д хадгалахгүй
    const now          = new Date();
    const thisMonth    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthTxs = txs.filter(t => t.date && t.date.substring(0, 7) === thisMonth);

    let monthIncome = 0, monthExpense = 0;
    thisMonthTxs.forEach(t => {
        if (t.type === 'income')       monthIncome  += t.amount;
        else if (t.type === 'expense') monthExpense += t.amount;
    });
    renderMonthlyBadge(monthIncome, monthExpense, thisMonth);

    for (const badgeName of toAward) {
        await supabase.from('badges').upsert([{
            user_id:    user.id,
            badge_name: badgeName,
            awarded_at: new Date().toISOString()
        }], { onConflict: 'user_id,badge_name', ignoreDuplicates: true });
        showBadgeNotification(badgeName);
    }

    await renderBadges();
}

// ── Сарын дүгнэлт UI ─────────────────────────────────────────
function renderMonthlyBadge(income, expense, monthStr) {
    const container = document.getElementById('monthly-badge-display');
    if (!container) return;

    if (income === 0 && expense === 0) {
        container.innerHTML = `
            <div class="monthly-badge-empty">📊</div>
            <div class="monthly-badge-empty-text">${monthStr} — гүйлгээ байхгүй</div>`;
        return;
    }

    const isProfitable = income > expense;
    const badge        = isProfitable ? MONTHLY_BADGES[0] : MONTHLY_BADGES[1];
    const diff         = Math.abs(income - expense).toLocaleString();
    const diffLabel    = isProfitable ? `+${diff} ₮ хэмнэлт` : `-${diff} ₮ алдагдал`;

    container.innerHTML = `
        <div class="monthly-result-box" style="background:${badge.bg}; border-color:${badge.border};">
            <i class="${badge.icon} result-icon" style="color:${badge.color};"></i>
            <div class="result-name">${badge.name}</div>
            <div class="result-diff" style="color:${badge.color};">${diffLabel}</div>
            <div class="result-month">${monthStr}</div>
        </div>`;
}

// ── Toast мэдэгдэл ────────────────────────────────────────────
function showBadgeNotification(badgeName) {
    const badge = MAIN_BADGES.find(b => b.name === badgeName);
    if (!badge) return;

    const toast = document.createElement('div');
    toast.className = 'badge-toast';
    toast.style.cssText = `background:${badge.bg}; border-color:${badge.border}; color:${badge.color};`;
    toast.innerHTML = `
        <i class="${badge.icon} toast-icon"></i>
        <div>
            <div class="toast-label">Шинэ тэмдэг авлаа! 🎉</div>
            <div>${badge.name}</div>
        </div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

// ── Badge UI харуулах ─────────────────────────────────────────
async function renderBadges() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: earnedBadges } = await supabase
        .from('badges').select('badge_name').eq('user_id', user.id);

    const earnedSet = new Set((earnedBadges || []).map(b => b.badge_name));

    const countEl = document.getElementById('badge-count-num');
    const totalEl = document.getElementById('badge-total-num');
    if (countEl) countEl.textContent = earnedSet.size;
    if (totalEl) totalEl.textContent = MAIN_BADGES.length;

    const preview = document.getElementById('badges-preview');
    const summary = document.getElementById('badges-summary');

    if (preview) {
        preview.innerHTML = MAIN_BADGES.map(badge => {
            const isEarned = earnedSet.has(badge.name);
            return `
                <span
                    class="badge-pill ${isEarned ? 'earned' : 'locked'}"
                    title="${badge.name}: ${badge.desc}"
                    style="${isEarned ? `background:${badge.bg}; border-color:${badge.border}; color:${badge.color};` : ''}"
                >
                    <i class="${badge.icon}"></i> ${badge.name}
                </span>`;
        }).join('');
    }

    if (summary) summary.textContent = `${earnedSet.size} / ${MAIN_BADGES.length} тэмдэг`;

    const fullList = document.getElementById('badges-full-list');
    if (!fullList) return;

    const mainRows = MAIN_BADGES.map(badge => {
        const isEarned = earnedSet.has(badge.name);
        return `
            <div class="badge-row ${isEarned ? '' : 'locked'}"
                style="background:${isEarned ? badge.bg : '#f9fafb'}; border-color:${isEarned ? badge.border : '#f3f4f6'};">
                <div class="badge-icon-box" style="background:${isEarned ? badge.border + '33' : '#e5e7eb'};">
                    <i class="${badge.icon}" style="color:${isEarned ? badge.color : '#9ca3af'};"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="badge-name" style="color:${isEarned ? badge.color : '#9ca3af'};">${badge.name}</div>
                    <div class="badge-desc">${badge.desc}</div>
                </div>
                ${isEarned
                    ? `<i class="fa-solid fa-circle-check badge-check" style="color:${badge.color};"></i>`
                    : `<i class="fa-solid fa-lock badge-lock"></i>`
                }
            </div>`;
    }).join('');

    const monthlyRows = MONTHLY_BADGES.map(badge => `
        <div class="badge-row-monthly" style="border-color:${badge.border}33;">
            <div class="badge-icon-box" style="background:${badge.border}22;">
                <i class="${badge.icon}" style="color:${badge.color};"></i>
            </div>
            <div class="flex-grow-1">
                <div class="badge-name" style="color:${badge.color};">${badge.name}</div>
                <div class="badge-desc">${badge.desc}</div>
            </div>
            <span class="badge-auto-tag">Авто</span>
        </div>`).join('');

    fullList.innerHTML = `
        <p class="section-eyebrow">Үндсэн амжилтууд</p>
        ${mainRows}
        <hr class="my-3">
        <p class="section-eyebrow">Сарын дүгнэлт</p>
        ${monthlyRows}`;
}
