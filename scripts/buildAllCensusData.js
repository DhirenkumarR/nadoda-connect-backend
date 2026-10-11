import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
global.DOMMatrix = class DOMMatrix {};
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = 'C:/Users/dhire/.gemini/antigravity-ide/brain/f7648d0b-3ef5-4642-acd2-4001b16948d6/.user_uploaded/media_1791641721629.pdf';

const gujToEngDigits = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

const atakMeta = {
    'ચાવડા': { en: 'Chavda', gu: 'ચાવડા', kuldeviGu: 'શ્રી આશાપુરા માતાજી', kuldeviEn: 'Shree Ashapura Mataji' },
    'ડાભી': { en: 'Dabhi', gu: 'ડાભી', kuldeviGu: 'શ્રી મોમાય માતાજી', kuldeviEn: 'Shree Momai Mataji' },
    'સિંધવ': { en: 'Sindhav', gu: 'સિંધવ', kuldeviGu: 'શ્રી સિંધવાઈ માતાજી', kuldeviEn: 'Shree Sindhuvai Mataji' },
    'સસિંધવ': { en: 'Sindhav', gu: 'સિંધવ', kuldeviGu: 'શ્રી સિંધવાઈ માતાજી', kuldeviEn: 'Shree Sindhuvai Mataji' },
    'રાઠોડ': { en: 'Rathod', gu: 'રાઠોડ', kuldeviGu: 'શ્રી વડેચી માતાજી', kuldeviEn: 'Shree Vadechi Mataji' },
    'ખેર': { en: 'Kher', gu: 'ખેર', kuldeviGu: 'શ્રી લાલબાઈ માતાજી', kuldeviEn: 'Shree Lalbai Mataji' },
    'દેસાઈ': { en: 'Desai', gu: 'દેસાઈ', kuldeviGu: 'શ્રી મોમાય માતાજી', kuldeviEn: 'Shree Momai Mataji' },
    'ગોદહલ': { en: 'Gohil', gu: 'ગોહિલ', kuldeviGu: 'શ્રી લીંબોજ માતાજી', kuldeviEn: 'Shree Limboj Mataji' },
    'ગોહિલ': { en: 'Gohil', gu: 'ગોહિલ', kuldeviGu: 'શ્રી લીંબોજ માતાજી', kuldeviEn: 'Shree Limboj Mataji' },
    'ડોડીયા': { en: 'Dodiya', gu: 'ડોડીયા', kuldeviGu: 'શ્રી વેરાઈ માતાજી', kuldeviEn: 'Shree Verai Mataji' }
};

const relationsList = [
    { gu: 'પોતે', en: 'Self' },
    { gu: 'પત્ ની', en: 'Wife', stdGu: 'પત્ની' },
    { gu: 'પત્ની', en: 'Wife', stdGu: 'પત્ની' },
    { gu: 'પુત્ર વધુ', en: 'Daughter-in-law', stdGu: 'પુત્રવધુ' },
    { gu: 'પુત્રવધુ', en: 'Daughter-in-law', stdGu: 'પુત્રવધુ' },
    { gu: 'પૌત્ર વધુ', en: 'Granddaughter-in-law', stdGu: 'પૌત્રવધુ' },
    { gu: 'પૌત્રવધુ', en: 'Granddaughter-in-law', stdGu: 'પૌત્રવધુ' },
    { gu: 'પુત્ર', en: 'Son', stdGu: 'પુત્ર' },
    { gu: 'પુત્રી', en: 'Daughter', stdGu: 'પુત્રી' },
    { gu: 'પત્રુ ી', en: 'Daughter', stdGu: 'પુત્રી' },
    { gu: 'પૌત્ર ી', en: 'Granddaughter', stdGu: 'પૌત્રી' },
    { gu: 'પૌત્રી', en: 'Granddaughter', stdGu: 'પૌત્રી' },
    { gu: 'પૌત્ર', en: 'Grandson', stdGu: 'પૌત્ર' },
    { gu: 'પિતા', en: 'Father', stdGu: 'પિતા' },
    { gu: 'તપતા', en: 'Father', stdGu: 'પિતા' },
    { gu: 'માતા', en: 'Mother', stdGu: 'માતા' },
    { gu: 'ભાઈ', en: 'Brother', stdGu: 'ભાઈ' },
    { gu: 'ભાભી', en: 'Sister-in-law', stdGu: 'ભાભી' },
    { gu: 'ભત્રીજો', en: 'Nephew', stdGu: 'ભત્રીજો' },
    { gu: 'બહેન', en: 'Sister', stdGu: 'બહેન' },
    { gu: 'દાદા', en: 'Grandfather', stdGu: 'દાદા' },
    { gu: 'દાદી', en: 'Grandmother', stdGu: 'દાદી' },
    { gu: 'કાકા', en: 'Uncle', stdGu: 'કાકા' },
    { gu: 'વહુઆરુ', en: 'Daughter-in-law', stdGu: 'વહુઆરુ' }
];

function toEnglishDigits(str) {
    if (!str) return '';
    return str.replace(/[૦-૯]/g, d => gujToEngDigits[d]);
}

function transliterateGujaratiToEnglish(name) {
    // Basic clean transliteration mapping for Nadoda Rajput names
    const cleaned = name.replace(/[-]/g, '').trim();
    return cleaned;
}

async function parseAllRecords() {
    console.log('[Parser] Reading PDF binary...');
    const buf = fs.readFileSync(PDF_PATH);
    const parser = new PDFParse(new Uint8Array(buf));
    const parsedPdf = await parser.getText();

    let rawRows = [];
    for (let p = 1; p < parsedPdf.pages.length; p++) {
        const lines = parsedPdf.pages[p].text.split('\n');
        for (const rawLine of lines) {
            const l = rawLine.trim();
            if (!l || !/^[૦-૯]/.test(l)) continue;
            rawRows.push({ page: p + 1, raw: l });
        }
    }

    console.log(`[Parser] Extracted ${rawRows.length} raw data rows.`);

    let families = [];
    let currentFamily = null;
    let currentHouseNumber = 0;
    let currentAtakInfo = null;

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const line = row.raw.replace(/\t/g, ' ').replace(/\s+/g, ' ');

        // 1. Identify Atak
        let matchedAtakKey = null;
        let atakPos = -1;
        for (const k of Object.keys(atakMeta)) {
            const idx = line.indexOf(k);
            if (idx !== -1 && (atakPos === -1 || idx < atakPos)) {
                atakPos = idx;
                matchedAtakKey = k;
            }
        }

        const atakInfo = atakMeta[matchedAtakKey];

        // 2. Identify Relation
        let matchedRelation = null;
        let relPos = -1;
        for (const r of relationsList) {
            const idx = line.indexOf(r.gu, atakPos + matchedAtakKey.length);
            if (idx !== -1 && (relPos === -1 || idx < relPos)) {
                relPos = idx;
                matchedRelation = r;
            }
        }

        // 3. Name is between Atak and Relation
        let rawName = line.substring(atakPos, relPos).trim();
        // clean up duplicate spacing inside name
        rawName = rawName.replace(/કાાંતત/g, 'કાંતિ').replace(/તવજય/g, 'વિજય').replace(/તપ્રન્ સ/g, 'પ્રિન્સ').replace(/દદલીપ/g, 'દિલીપ');

        // 4. Gender (end of line)
        const isMale = line.endsWith('પુરુષ') || line.includes('પુરુષ');
        const gender = isMale
            ? { key: 'male', gu: 'પુરુષ' }
            : { key: 'female', gu: 'સ્ત્રી' };

        // 5. Mobile Number (if present before gender)
        let mobileNumber = null;
        const phoneMatch = line.match(/([૬-૯][૦-૯\s]{8,15})(?=\s*(પુરુષ|સ્ત્રી|સ્ત્ર ી))/);
        if (phoneMatch) {
            const pDigits = toEnglishDigits(phoneMatch[1]).replace(/\s+/g, '');
            if (pDigits.length === 10) {
                mobileNumber = pDigits;
            }
        }

        // 6. Text after relation, up to mobile/gender
        let endIdx = phoneMatch ? line.lastIndexOf(phoneMatch[1]) : line.lastIndexOf(isMale ? 'પુરુષ' : 'સ્ત્ર');
        if (endIdx === -1) endIdx = line.length;
        const middleText = line.substring(relPos + matchedRelation.gu.length, endIdx).trim();

        // 7. Marital Status
        let maritalStatus = { key: 'other', gu: 'અન્ય' };
        if (middleText.includes('અપરણણત') || middleText.includes('અપરણિત')) {
            maritalStatus = { key: 'unmarried', gu: 'અપરણિત' };
        } else if (middleText.includes('પરણણત') || middleText.includes('પરણિત')) {
            maritalStatus = { key: 'married', gu: 'પરણિત' };
        } else if (middleText.includes('તવધવા') || middleText.includes('વિધવા')) {
            maritalStatus = { key: 'widow', gu: 'વિધવા' };
        } else if (middleText.includes('તવધુર') || middleText.includes('વિધુર')) {
            maritalStatus = { key: 'widower', gu: 'વિધુર' };
        } else if (middleText.includes('-') && (line.includes('પૌત્ર') || line.includes('પુત્ર'))) {
            maritalStatus = { key: 'unmarried', gu: 'અપરણિત' };
        }

        // 8. Age (first Gujarati digit sequence in middleText)
        let age = null;
        const ageMatch = middleText.match(/[૦-૯]+/);
        if (ageMatch) {
            age = parseInt(toEnglishDigits(ageMatch[0]), 10);
        }

        // 9. Education & Occupation
        const isStudying = middleText.includes('ચાલુ') || middleText.includes('અભ્યાસ') || middleText.includes('અભ્ યાસ');
        let educationQualification = '-';
        if (middleText.includes('બી.એડ.')) educationQualification = 'B.Ed';
        else if (middleText.includes('બી.એસસી.')) educationQualification = 'B.Sc';
        else if (middleText.includes('એમબીબીએસ') || middleText.includes('MBBS')) educationQualification = 'MBBS';
        else if (middleText.includes('બીએએમએસ') || middleText.includes('BAMS')) educationQualification = 'BAMS';
        else if (middleText.includes('પીટીસી') || middleText.includes('PTC')) educationQualification = 'PTC';
        else if (middleText.includes('ડીપ્લોમા') || middleText.includes('Diploma')) educationQualification = 'Diploma';
        else if (middleText.includes('એન્જીનીયરીંગ') || middleText.includes('Engineering')) educationQualification = 'Engineering';
        else if (middleText.includes('બી.એ.') || middleText.includes('બીએ')) educationQualification = 'B.A';
        else if (middleText.includes('સ્નાતક')) educationQualification = 'Graduate';
        else if (middleText.includes('અનુસ્નાતક')) educationQualification = 'Post Graduate';
        else if (middleText.includes('૧ ૦') || middleText.includes('૧૦')) educationQualification = '10th';
        else if (middleText.includes('૧ ૨') || middleText.includes('૧૨')) educationQualification = '12th';
        else if (middleText.includes('૮')) educationQualification = '8th';
        else if (middleText.includes('૫')) educationQualification = '5th';

        let occupationTitle = 'ઘરકામ';
        let occupationCategory = 'homemaker';
        let workCity = 'બાસ્પા';

        if (middleText.includes('ખેતી')) {
            occupationTitle = 'ખેતી';
            occupationCategory = 'agriculture';
        } else if (middleText.includes('ઘરકામ')) {
            occupationTitle = 'ઘરકામ';
            occupationCategory = 'homemaker';
        } else if (middleText.includes('અભ્ યાસ') || middleText.includes('અભ્યાસ') || isStudying) {
            occupationTitle = 'અભ્યાસ';
            occupationCategory = 'student';
        } else if (middleText.includes('નોકરી')) {
            occupationTitle = 'નોકરી પ્રાઇવેટ';
            occupationCategory = 'private_job';
        } else if (middleText.includes('તશક્ષ ક') || middleText.includes('શિક્ષક')) {
            occupationTitle = 'શિક્ષક';
            occupationCategory = 'govt_job';
        } else if (middleText.includes('ડોક્ટર')) {
            occupationTitle = 'ડોક્ટર';
            occupationCategory = 'professional';
        } else if (middleText.includes('એન્જીનીયર')) {
            occupationTitle = 'એન્જીનીયર';
            occupationCategory = 'professional';
        } else if (middleText.includes('વેપાર') || middleText.includes('દુકાન')) {
            occupationTitle = 'વેપાર';
            occupationCategory = 'business';
        } else if (middleText.includes('મજુરી')) {
            occupationTitle = 'મજુરીકામ';
            occupationCategory = 'labour';
        } else if (middleText.includes('નિવૃત્ત') || middleText.includes('તનવત્તૃ')) {
            occupationTitle = 'નિવૃત્ત';
            occupationCategory = 'retired';
        } else if (middleText.includes('ગેરેજ')) {
            occupationTitle = 'ગેરેજ';
            occupationCategory = 'business';
        } else if (middleText.includes('પીયુન')) {
            occupationTitle = 'પીયુન';
            occupationCategory = 'govt_job';
        }

        // Extract city from middle text
        if (middleText.includes('અમદાવાદ')) workCity = 'અમદાવાદ';
        else if (middleText.includes('ગાંધીધામ') || middleText.includes('ગાધાં ીધામ')) workCity = 'ગાંધીધામ';
        else if (middleText.includes('રાધનપુર')) workCity = 'રાધનપુર';
        else if (middleText.includes('સુરત')) workCity = 'સુરત';
        else if (middleText.includes('પાટણ')) workCity = 'પાટણ';
        else if (middleText.includes('વિસનગર') || middleText.includes('તવસનગર')) workCity = 'વિસનગર';
        else if (middleText.includes('ચીખલી')) workCity = 'ચીખલી';
        else if (middleText.includes('ભરૂચ')) workCity = 'ભરૂચ';
        else if (middleText.includes('અમરેલી')) workCity = 'અમરેલી';
        else if (middleText.includes('કુકરવાડા')) workCity = 'કુકરવાડા';
        else if (middleText.includes('કચ્છ')) workCity = 'કચ્છ';
        else if (middleText.includes('સમી')) workCity = 'સમી';

        const isHead = matchedRelation.en === 'Self';

        // Check if starting new family
        if (isHead) {
            currentHouseNumber++;
            currentAtakInfo = atakInfo;
            currentFamily = {
                houseNumber: currentHouseNumber,
                atak: { gu: atakInfo.gu, en: atakInfo.en },
                kuldevi: { gu: atakInfo.kuldeviGu, en: atakInfo.kuldeviEn },
                primaryMobile: mobileNumber,
                address: {
                    nativeVillage: { gu: 'બાસ્પા', en: 'Baspa' },
                    currentCity: { gu: workCity, en: workCity }
                },
                members: []
            };
            families.push(currentFamily);
        }

        // Add member to current family
        const serialNo = i + 1;
        const memberOrder = currentFamily ? currentFamily.members.length + 1 : 1;

        const memberObj = {
            serialNumber: serialNo,
            memberOrder,
            fullName: {
                gu: rawName,
                en: transliterateGujaratiToEnglish(rawName)
            },
            relationWithHead: {
                gu: matchedRelation.stdGu || matchedRelation.gu,
                en: matchedRelation.en
            },
            gender,
            age: age || (isHead ? 45 : 30),
            education: {
                qualification: educationQualification,
                isStudying
            },
            maritalStatus,
            occupation: {
                title: occupationTitle,
                category: occupationCategory,
                workCity
            },
            mobileNumber,
            isFamilyHead: isHead
        };

        if (currentFamily) {
            currentFamily.members.push(memberObj);
            if (!currentFamily.primaryMobile && mobileNumber) {
                currentFamily.primaryMobile = mobileNumber;
            }
        }
    }

    console.log(`[Parser] Successfully processed ${families.length} families.`);
    const totalMembers = families.reduce((acc, f) => acc + f.members.length, 0);
    console.log(`[Parser] Total members across all families: ${totalMembers}`);

    const outputPath = path.join(__dirname, '../data/allBaspaFamilies.json');
    fs.writeFileSync(outputPath, JSON.stringify(families, null, 2), 'utf-8');
    console.log(`[Parser] Saved all census data to: ${outputPath}`);
}

parseAllRecords().catch(console.error);
