const express = require('express');
const { usersRef } = require('./server');
const app = express();
app.use(express.json());
app.post('/users', async (req, res) => {
    const { name, email } = req.body;
    try {
        const user = await usersRef.add({ name, email });
        console.log('User added: ', user.id);
        res.json({ id: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});