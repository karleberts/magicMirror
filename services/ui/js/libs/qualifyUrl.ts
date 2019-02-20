export default function qualifyUrl(url: string) {
	const a = document.createElement('a');
	a.href = url;
	return a.href;
}
