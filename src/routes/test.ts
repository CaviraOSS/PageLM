export default async () => {
	app.get('/e', async (req, res) => {
		res.json({ message: 'e' });
	});
}