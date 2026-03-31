function getEnglishEquivalent(article) {
	const equivalentNode = article.querySelector("Equivalent[langue='en'] > Equi_prop");
	return equivalentNode?.textContent?.trim() ?? null;
}

function getFranceTermeURL(article) {
	const articleNumber = article.getAttribute("numero");
	if (articleNumber) {
		return `https://www.culture.fr/franceterme/terme/${articleNumber}`;
	}
	return null;
}

function normalizeString(str) {
    if (!str) return str;
    return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/Œ/g, "O")
            .replace(/œ/g, "o")
            .toUpperCase()
            .replace(/[^A-Z]/g, "");
}

function isSameLetter(a, b) {
    if (!a || !b) return false;
    return normalizeString(a.charAt(0)) === normalizeString(b.charAt(0));
}
function capitalizeFirstLetter(string) {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function renderResults(articlesList) {
	const outputEl = document.getElementById("output");

	const frToEnLines = [];
	let currentFrLetter = "";
	const frLetters = [];
	const enToFrEntries = [];

	for (const article of articlesList) {
		const termeBalise = article.querySelector("Terme_balise")?.textContent?.trim();
		const enEquivalent = getEnglishEquivalent(article);

		if (!termeBalise) {
			continue;
		}

		const firstLetter = termeBalise.charAt(0).toUpperCase();
		//if (firstLetter !== currentFrLetter) {
        if (!isSameLetter(firstLetter, currentFrLetter)) {
            currentFrLetter = normalizeString(firstLetter);
			const headingId = `fr-${currentFrLetter}`;
			frToEnLines.push(`
                <h2 id="${headingId}">
                <a href="#${headingId}">#
	                ${currentFrLetter}</a></h2>`);
			frLetters.push(`<a href="#${headingId}">${currentFrLetter}</a>`);
		}

		frToEnLines.push(`<a href="${getFranceTermeURL(article)}" target="_blank">
        ${capitalizeFirstLetter(termeBalise)} : </a> ${capitalizeFirstLetter(enEquivalent)}`);

        if (enEquivalent) {
            enToFrEntries.push({
                article,
                termeBalise,
                enEquivalent,
            });
        }
	}

	enToFrEntries.sort((a, b) => a.enEquivalent.localeCompare(b.enEquivalent, "en", { sensitivity: "base" }));

	const enToFrLines = [];
	let currentEnLetter = "";
	const enLetters = [];

	for (const entry of enToFrEntries) {
		const firstLetter = entry.enEquivalent.charAt(0).toUpperCase();
		if (firstLetter !== currentEnLetter) {
			currentEnLetter = firstLetter;
			const headingId = `en-${currentEnLetter}`;
			enToFrLines.push(`
                <h2 id="${headingId}">
                <a href="#${headingId}">#
	                ${currentEnLetter}</a></h2>`);
			enLetters.push(`<a href="#${headingId}">${currentEnLetter}</a>`);
		}

		enToFrLines.push(`<a href="${getFranceTermeURL(entry.article)}" target="_blank">
        ${capitalizeFirstLetter(entry.enEquivalent)} : </a> ${capitalizeFirstLetter(entry.termeBalise)}`);
	}

	console.log(`Nombre de définitions : ${articlesList.length}`);
	outputEl.innerHTML =
        `<p><a href="#FrenchToEnglish">Francais -> Anglais</a> | <a href="#EnglishToFrench">Anglais -> Francais</a></p>` +
        `<h1 id="FrenchToEnglish"> <a href="#FrenchToEnglish">
        Francais vers Anglais</h1>` +
		frLetters.join(", ") +
		"<br/><br/>" +
		frToEnLines.join("<br/>") +
		"<br/><br/><br/>" +
		`<h1 id="EnglishToFrench"> <a href="#EnglishToFrench">
        Anglais vers Francais</h1>` +
		enLetters.join(", ") +
		"<br/><br/>" +
		enToFrLines.join("<br/>");
}

async function loadFranceTerme() {
	const outputEl = document.getElementById("output");

	try {
		const response = await fetch("./FranceTerme.xml");
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} while loading FranceTerme.xml`);
		}

		const xmlText = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlText, "application/xml");
		const parseError = xmlDoc.querySelector("parsererror");

		if (parseError) {
			throw new Error("Invalid XML format in FranceTerme.xml");
		}

		const internetArticles = Array.from(xmlDoc.getElementsByTagName("Article")).filter((article) => {
            const subDomain = article.querySelector("S-dom[numero='1']")?.textContent?.trim() ?? null;
            const domain = article.querySelector("Dom[numero='1']")?.textContent?.trim() ?? null;
			const enEquivalent = getEnglishEquivalent(article);

			return (
				subDomain === "Internet" &&
				domain === "Informatique" &&
				enEquivalent !== null
			);
		});

		renderResults(internetArticles);
	} catch (error) {
		if (outputEl) {
			outputEl.textContent = error instanceof Error ? error.message : String(error);
		}
		console.error(error);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	void loadFranceTerme();
});
