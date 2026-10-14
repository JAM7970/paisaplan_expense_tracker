
const form = document.getElementById("transactionForm");

const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");

const transactionList = document.getElementById("transactionList");
const emptyMessage = document.getElementById("emptyMessage");

const searchInput = document.getElementById("search");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");

const budgetInput = document.getElementById("budgetInput");
const budgetMessage = document.getElementById("budgetMessage");
const budgetProgress = document.getElementById("budgetProgress");

const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const formHeading = document.getElementById("formHeading");

let transactions = [];
let budget = 0;
let editingId = null;


try {
    const savedTransactions = JSON.parse(
        localStorage.getItem("paisaplan-transactions") || "[]"
    );

    if (Array.isArray(savedTransactions)) {
        transactions = savedTransactions.filter(function (item) {
            return (
                item &&
                typeof item.title === "string" &&
                typeof item.amount === "number" &&
                Number.isFinite(item.amount) &&
                item.amount > 0 &&
                (item.type === "income" || item.type === "expense") &&
                typeof item.date === "string"
            );
        });
    }

    budget = Number(localStorage.getItem("paisaplan-budget")) || 0;

    if (!Number.isFinite(budget) || budget < 0) {
        budget = 0;
    }

    if (localStorage.getItem("paisaplan-theme") === "dark") {
        document.body.classList.add("dark");
    }
} catch (error) {
    transactions = [];
    budget = 0;
}


dateInput.value = getToday();

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}


function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}


function saveData() {
    localStorage.setItem(
        "paisaplan-transactions",
        JSON.stringify(transactions)
    );

    localStorage.setItem("paisaplan-budget", String(budget));
}

function updateSummary() {
    let income = 0;
    let expenses = 0;

    const currentMonth = getToday().slice(0, 7);

    transactions.forEach(function (item) {
        if (item.type === "income") {
            income += item.amount;
        } else {
            expenses += item.amount;
        }
    });

    balanceElement.textContent = formatMoney(income - expenses);
    incomeElement.textContent = formatMoney(income);
    expensesElement.textContent = formatMoney(expenses);

    let monthlyExpenses = 0;

    transactions.forEach(function (item) {
        if (
            item.type === "expense" &&
            item.date.slice(0, 7) === currentMonth
        ) {
            monthlyExpenses += item.amount;
        }
    });

    if (budget > 0) {
        const percentage = (monthlyExpenses / budget) * 100;

        budgetMessage.textContent =
            "Spent " + formatMoney(monthlyExpenses) +
            " out of " + formatMoney(budget);

        if (monthlyExpenses > budget) {
            budgetMessage.textContent += " — Budget exceeded!";
        } else {
            budgetMessage.textContent +=
                " — Remaining: " +
                formatMoney(budget - monthlyExpenses);
        }

        budgetProgress.style.width =
            Math.min(percentage, 100) + "%";

        budgetProgress.style.background =
            percentage > 100 ? "#dc2626" :
            percentage >= 80 ? "#f59e0b" : "#16a34a";
    } else {
        budgetMessage.textContent =
            "Set a budget to track your monthly spending.";

        budgetProgress.style.width = "0";
    }
}

function displayTransactions() {
    transactionList.innerHTML = "";

    const searchText = searchInput.value.toLowerCase().trim();
    const selectedType = typeFilter.value;
    const selectedCategory = categoryFilter.value;

    const filteredTransactions = transactions.filter(function (item) {
        const matchesSearch =
            item.title.toLowerCase().includes(searchText) ||
            (item.note || "").toLowerCase().includes(searchText);

        const matchesType =
            selectedType === "all" || item.type === selectedType;

        const matchesCategory =
            selectedCategory === "all" ||
            item.category === selectedCategory;

        return matchesSearch && matchesType && matchesCategory;
    });

    emptyMessage.style.display =
        filteredTransactions.length === 0 ? "block" : "none";

    filteredTransactions.forEach(function (item) {
        const li = document.createElement("li");
        li.className = "transaction";

        const details = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = item.title;

        const date = document.createElement("p");
        date.textContent =
            item.date + " | " + (item.category || "Other");

        details.appendChild(name);
        details.appendChild(date);

        if (item.note) {
            const note = document.createElement("p");
            note.textContent = item.note;
            details.appendChild(note);
        }

        const actions = document.createElement("div");
        actions.className = "transaction-actions";

        const amount = document.createElement("span");

        amount.className =
            "transaction-amount " +
            (item.type === "income" ? "income-text" : "expense-text");

        amount.textContent =
            (item.type === "income" ? "+" : "-") +
            formatMoney(item.amount);

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-button";

        editButton.addEventListener("click", function () {
            startEdit(item.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", function () {
            deleteTransaction(item.id);
        });

        actions.appendChild(amount);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        li.appendChild(details);
        li.appendChild(actions);

        transactionList.appendChild(li);
    });
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;
    const note = noteInput.value.trim();

    if (
        !title ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date ||
        date > getToday()
    ) {
        alert("Please enter valid details and a date not in the future.");
        return;
    }

    if (editingId !== null) {
        const item = transactions.find(function (transaction) {
            return transaction.id === editingId;
        });

        if (item) {
            item.title = title;
            item.amount = amount;
            item.type = type;
            item.category = category;
            item.date = date;
            item.note = note;
        }
    } else {
        const newTransaction = {
            id: Date.now() + Math.random(),
            title: title,
            amount: amount,
            type: type,
            category: category,
            date: date,
            note: note
        };

        transactions.unshift(newTransaction);
    }

    saveData();
    resetForm();
    updateApp();
});

function startEdit(id) {
    const item = transactions.find(function (transaction) {
        return transaction.id === id;
    });

    if (!item) {
        return;
    }

    editingId = id;

    titleInput.value = item.title;
    amountInput.value = item.amount;
    typeInput.value = item.type;
    categoryInput.value = item.category || "Other";
    dateInput.value = item.date;
    noteInput.value = item.note || "";

    formHeading.textContent = "Edit Transaction";
    submitButton.textContent = "Save Changes";
    cancelButton.hidden = false;

    form.scrollIntoView({ behavior: "smooth" });
}

function deleteTransaction(id) {
    const confirmed = confirm("Delete this transaction?");

    if (!confirmed) {
        return;
    }

    transactions = transactions.filter(function (item) {
        return item.id !== id;
    });

    if (editingId === id) {
        resetForm();
    }

    saveData();
    updateApp();
}

function resetForm() {
    form.reset();
    editingId = null;

    formHeading.textContent = "Add Transaction";
    submitButton.textContent = "Add Transaction";
    cancelButton.hidden = true;

    dateInput.value = getToday();
}

cancelButton.addEventListener("click", resetForm);

document.getElementById("budgetButton").addEventListener("click", function () {
    const newBudget = Number(budgetInput.value);

    if (!Number.isFinite(newBudget) || newBudget <= 0) {
        alert("Please enter a valid budget.");
        return;
    }

    budget = newBudget;
    saveData();
    updateSummary();

    budgetInput.value = "";
});

searchInput.addEventListener("input", displayTransactions);
typeFilter.addEventListener("change", displayTransactions);
categoryFilter.addEventListener("change", displayTransactions);

// Dark mode
document.getElementById("themeButton").addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const theme = document.body.classList.contains("dark")
        ? "dark"
        : "light";

    localStorage.setItem("paisaplan-theme", theme);

    this.textContent =
        theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
});

document.getElementById("exportButton").addEventListener("click", function () {
    if (transactions.length === 0) {
        alert("There are no transactions to export.");
        return;
    }

    const headings = [
        "Name", "Amount", "Type", "Category", "Date", "Note"
    ];

    const rows = transactions.map(function (item) {
        return [
            item.title,
            item.amount,
            item.type,
            item.category || "Other",
            item.date,
            item.note || ""
        ];
    });

    const csvData = [headings, ...rows]
        .map(function (row) {
            return row.map(function (value) {
                let text = String(value);

                if (/^[=+\-@\t\r]/.test(text)) {
                    text = "'" + text;
                }

                return '"' + text.replace(/"/g, '""') + '"';
            }).join(",");
        })
        .join("\n");

    const file = new Blob(["\uFEFF" + csvData], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "paisaplan-transactions.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

function updateApp() {
    updateSummary();
    displayTransactions();
}

document.getElementById("themeButton").textContent =
    document.body.classList.contains("dark")
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

updateApp();