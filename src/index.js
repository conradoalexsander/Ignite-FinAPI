const express = require('express');
const { v4: uuidv4 } = require("uuid");

const app = express();

const accounts = [];
//Middleware
function verifyIfAccountCPFExists(request, response, next) {
    const { cpf } = request.headers;

    const account = accounts.find(account => account.cpf == cpf);

    if (!account)
        return response.status(400).json({ error: "account not found" });

    request.account = account;

    return next()
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if (operation.type == 'credit')
            return acc + operation.amount;

        return acc - operation.amount;
    }, 0);

    return balance;
}

app.use(express.json());

app.post("/account", (request, response) => {
    const { cpf, name, statement } = request.body;

    const accountAlreadyExists = accounts.some(account => account.cpf === cpf);

    if (accountAlreadyExists)
        return response.status(400).json({ error: "account already exists!" });

    accounts.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();
})

app.put("/account", verifyIfAccountCPFExists, (request, response) => {
    const { name } = request.body;
    const { account } = request;

    account.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfAccountCPFExists, (request, response) => {
    const { account } = request;

    return response.status(200).json(account);
});

app.delete("/account", verifyIfAccountCPFExists, (request, response) => {
    const { account } = request;

    if (getBalance(account.statement) !== 0) {
        return response.status(400).json({ error: "To delete an account, its balance must be zero (0)." });
    }

    const accountIndex = accounts.findIndex(storedAccount => storedAccount.id == account.id);

    accounts.splice(accountIndex, 1);

    return response.status(200).json(accounts);
});

app.post("/deposit", verifyIfAccountCPFExists, (request, response) => {
    const { description, amount } = request.body;
    const { account } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    account.statement.push(statementOperation);

    return response.status(201).send();
})

app.post("/withdraw", verifyIfAccountCPFExists, (request, response) => {
    const { amount } = request.body;
    const { account } = request;

    const balance = getBalance(account.statement);

    if (balance < amount) {
        return response.status(400).json({ error: "Insufficient funds!" });
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    account.statement.push(statementOperation);

    return response.status(201).send();
})

app.get("/balance", verifyIfAccountCPFExists, (request, response) => {
    const { account } = request;

    const balance = getBalance(account.statement);

    return response.status(201).json({ balance });
})

app.get("/statement", verifyIfAccountCPFExists, (request, response) => {
    const { account } = request;
    return response.json(account.statement);
})

app.get("/statement/date", verifyIfAccountCPFExists, (request, response) => {
    const { account } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = account.statement.filter(
        (statement) =>
            statement.created_at.toDateString() ===
            new Date(dateFormat).toDateString()
    );

    return response.json(statement);
})

app.listen(3333);