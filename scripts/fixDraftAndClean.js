import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRAFT_PATH = path.join(__dirname, '../data/allBaspaFamilies_completed_draft.json');

const atakMap = {
    'ચાવડા': { en: 'Chavda', gu: 'ચાવડા', kuldeviGu: 'શ્રી આશાપુરા માતાજી', kuldeviEn: 'Shree Ashapura Mataji' },
    'ડાભી': { en: 'Dabhi', gu: 'ડાભી', kuldeviGu: 'શ્રી મોમાય માતાજી', kuldeviEn: 'Shree Momai Mataji' },
    'સિંધવ': { en: 'Sindhav', gu: 'સિંધવ', kuldeviGu: 'શ્રી સિંધવાઈ માતાજી', kuldeviEn: 'Shree Sindhuvai Mataji' },
    'સસિંધવ': { en: 'Sindhav', gu: 'સિંધવ', kuldeviGu: 'શ્રી સિંધવાઈ માતાજી', kuldeviEn: 'Shree Sindhuvai Mataji' },
    'રાઠોડ': { en: 'Rathod', gu: 'રાઠોડ', kuldeviGu: 'શ્રી વડેચી માતાજી', kuldeviEn: 'Shree Vadechi Mataji' },
    'ખેર': { en: 'Kher', gu: 'ખેર', kuldeviGu: 'શ્રી લાલબાઈ માતાજી', kuldeviEn: 'Shree Lalbai Mataji' },
    'દેસાઈ': { en: 'Desai', gu: 'દેસાઈ', kuldeviGu: 'શ્રી મોમાય માતાજી', kuldeviEn: 'Shree Momai Mataji' },
    'ગોહિલ': { en: 'Gohil', gu: 'ગોહિલ', kuldeviGu: 'શ્રી લીંબોજ માતાજી', kuldeviEn: 'Shree Limboj Mataji' },
    'ગોદહલ': { en: 'Gohil', gu: 'ગોહિલ', kuldeviGu: 'શ્રી લીંબોજ માતાજી', kuldeviEn: 'Shree Limboj Mataji' },
    'ડોડીયા': { en: 'Dodiya', gu: 'ડોડીયા', kuldeviGu: 'શ્રી વેરાઈ માતાજી', kuldeviEn: 'Shree Verai Mataji' }
};

const cityMap = {
    'બાસ્પા': { gu: 'બાસ્પા', en: 'Baspa' },
    'અમદાવાદ': { gu: 'અમદાવાદ', en: 'Ahmedabad' },
    'ગાંધીધામ': { gu: 'ગાંધીધામ', en: 'Gandhidham' },
    'ગાધાં ીધામ': { gu: 'ગાંધીધામ', en: 'Gandhidham' },
    'રાધનપુર': { gu: 'રાધનપુર', en: 'Radhanpur' },
    'સુરત': { gu: 'સુરત', en: 'Surat' },
    'પાટણ': { gu: 'પાટણ', en: 'Patan' },
    'વિસનગર': { gu: 'વિસનગર', en: 'Visnagar' },
    'તવસનગર': { gu: 'વિસનગર', en: 'Visnagar' },
    'ચીખલી': { gu: 'ચીખલી', en: 'Chikhli' },
    'ભરૂચ': { gu: 'ભરૂચ', en: 'Bharuch' },
    'અમરેલી': { gu: 'અમરેલી', en: 'Amreli' },
    'કુકરવાડા': { gu: 'કુકરવાડા', en: 'Kukarwada' },
    'સમી': { gu: 'સમી', en: 'Sami' },
    'હારીજ': { gu: 'હારીજ', en: 'Harij' },
    'કચ્છ': { gu: 'કચ્છ', en: 'Kutch' },
    'કેનેડા': { gu: 'કેનેડા', en: 'Canada' },
    'રાજકોટ': { gu: 'રાજકોટ', en: 'Rajkot' },
    'ચોટીલા': { gu: 'ચોટીલા', en: 'Chotila' },
    'શંખેશ્વર': { gu: 'શંખેશ્વર', en: 'Shankheshwar' },
    'શાંખેિર': { gu: 'શંખેશ્વર', en: 'Shankheshwar' },
    'ગોંડલ': { gu: 'ગોંડલ', en: 'Gondal' },
    'વારાહી': { gu: 'વારાહી', en: 'Varahi' },
    'બેચરાજી': { gu: 'બેચરાજી', en: 'Becharaji' }
};

const relationMap = {
    'પોતે': { gu: 'પોતે', en: 'Self' },
    'પત્ની': { gu: 'પત્ની', en: 'Wife' },
    'પત્ ની': { gu: 'પત્ની', en: 'Wife' },
    'પુત્ર': { gu: 'પુત્ર', en: 'Son' },
    'પુત્રી': { gu: 'પુત્રી', en: 'Daughter' },
    'પત્રુ ી': { gu: 'પુત્રી', en: 'Daughter' },
    'પુત્રવધુ': { gu: 'પુત્રવધુ', en: 'Daughter-in-law' },
    'પુત્ર વધુ': { gu: 'પુત્રવધુ', en: 'Daughter-in-law' },
    'પૌત્ર': { gu: 'પૌત્ર', en: 'Grandson' },
    'પૌત્રી': { gu: 'પૌત્રી', en: 'Granddaughter' },
    'પૌત્ર ી': { gu: 'પૌત્રી', en: 'Granddaughter' },
    'પૌત્રવધુ': { gu: 'પૌત્રવધુ', en: 'Granddaughter-in-law' },
    'પૌત્ર વધુ': { gu: 'પૌત્રવધુ', en: 'Granddaughter-in-law' },
    'પિતા': { gu: 'પિતા', en: 'Father' },
    'તપતા': { gu: 'પિતા', en: 'Father' },
    'માતા': { gu: 'માતા', en: 'Mother' },
    'ભાઈ': { gu: 'ભાઈ', en: 'Brother' },
    'ભાભી': { gu: 'ભાભી', en: 'Sister-in-law' },
    'ભત્રીજો': { gu: 'ભત્રીજો', en: 'Nephew' },
    'બહેન': { gu: 'બહેન', en: 'Sister' },
    'દાદા': { gu: 'દાદા', en: 'Grandfather' },
    'દાદી': { gu: 'દાદી', en: 'Grandmother' },
    'કાકા': { gu: 'કાકા', en: 'Uncle' },
    'વહુઆરુ': { gu: 'વહુઆરુ', en: 'Daughter-in-law' },
    '2-': { gu: 'પૌત્ર', en: 'Grandson' }
};

const curatedNames = {
    'કાંતિ': 'Kanti', 'કાાંતત': 'Kanti', 'કરમણ': 'Karman', 'અનસોયા': 'Ansoya', 'અનસૂયા': 'Ansuya', 'અનસુયા': 'Ansuya',
    'વૈદિક': 'Vaidik', 'વૈદદક': 'Vaidik', 'અરજણ': 'Arjan', 'મધુ': 'Madhu', 'દિલીપ': 'Dilip', 'દદલીપ': 'Dilip',
    'જનક': 'Janak', 'મોતી': 'Moti', 'નાથી': 'Nathi', 'કલ્પેશ': 'Kalpesh', 'કલ્ પેશ': 'Kalpesh',
    'અમર': 'Amar', 'જયરાજ': 'Jayraj', 'માદેવ': 'Madev', 'મહાદેવ': 'Mahadev', 'પશી': 'Pashi',
    'વિજય': 'Vijay', 'તવજય': 'Vijay', 'મીના': 'Mina', 'કૃપાલ': 'Krupal', 'દલા': 'Dala',
    'રાજી': 'Raji', 'મોહન': 'Mohan', 'રમી': 'Rami', 'સુરેશ': 'Suresh', 'ભાવેશ': 'Bhavesh',
    'ચેતના': 'Chetna', 'અજા': 'Aja', 'પબુ': 'Pabhu', 'કાંકુ': 'Kanku', 'હાંસા': 'Hansa', 'હંસા': 'Hansa',
    'પ્રિન્સ': 'Prince', 'તપ્રન્સ': 'Prince', 'તપ્રન્ સ': 'Prince', 'અશ્વિન': 'Ashvin', 'અતિન': 'Ashvin',
    'ભીખી': 'Bhikhi', 'ધ્રુવાંશી': 'Dhruvanshi', 'ધ્રુ વાાંશી': 'Dhruvanshi', 'કરશન': 'Karshan', 'કરસન': 'Karshan',
    'જસી': 'Jasi', 'હિતેશ': 'Hitesh', 'દહતેશ': 'Hitesh', 'વર્ષા': 'Varsha', 'વષા': 'Varsha',
    'નાગરાજ': 'Nagraj', 'કલા': 'Kala', 'મુકેશ': 'Mukesh', 'મકુેશ': 'Mukesh', 'વસુ': 'Vasu',
    'ઝબી': 'Zhabi', 'ભરત': 'Bharat', 'સોનલ': 'Sonal', 'જ્યોતિ': 'Jyoti', 'જ્યોતત': 'Jyoti',
    'બાબા': 'Baba', 'ભગવાન': 'Bhagwan', 'કમુ': 'Kamu', 'વિનોદ': 'Vinod', 'તવનોદ': 'Vinod',
    'સંગીતા': 'Sangeeta', 'સાંગીતા': 'Sangeeta', 'સગાં ીતા': 'Sangeeta', 'હમીર': 'Hamir', 'વાલી': 'Vali',
    'દિનેશ': 'Dinesh', 'દદનેશ': 'Dinesh', 'દક્ષા': 'Daxa', 'કાનો': 'Kano', 'દાદુ': 'Dadu',
    'સોમા': 'Soma', 'પૂરી': 'Puri', 'પરૂી': 'Puri', 'લલિત': 'Lalit', 'લણલત': 'Lalit',
    'અર્પિત': 'Arpit', 'અતપિત': 'Arpit', 'પૂંજા': 'Punja', 'પુાંજા': 'Punja', 'પજાુાં': 'Punja',
    'જલુ': 'Jalu', 'ચિરાગ': 'Chirag', 'ણચરાગ': 'Chirag', 'હેતલ': 'Hetal', 'હતે લ': 'Hetal',
    'સૃષ્ટિ': 'Srishti', 'સૃષ્ટી': 'Srishti', 'સષ્ૃટી': 'Srishti', 'અભયરાજ': 'Abhayraj', 'ખેગાર': 'Khegar',
    'ભગી': 'Bhagi', 'પ્રકાશ': 'Prakash', 'કિરણ': 'Kiran', 'દકરણ': 'Kiran', 'કૈલાશ': 'Kailash',
    'લાલા': 'Lala', 'ખેતા': 'Kheta', 'ભૂલી': 'Bhuli', 'ભલૂ ી': 'Bhuli', 'જીવી': 'Jivi',
    'મહેશ': 'Mahesh', 'મહશે': 'Mahesh', 'રાજ': 'Raj', 'નીખિલ': 'Nikhil', 'નીખીલ': 'Nikhil',
    'ડુંગર': 'Dungar', 'ડુાંગર': 'Dungar', 'લીલા': 'Lila', 'મયૂર': 'Mayur', 'મયરુ': 'Mayur',
    'વેદ': 'Ved', 'મહેન્દ્ર': 'Mahendra', 'મહન્ેર': 'Mahendra', 'શંકર': 'Shankar', 'શાંકર': 'Shankar', 'શકાં ર': 'Shankar',
    'સુમિતા': 'Sumita', 'સુતમતા': 'Sumita', 'સતુમતા': 'Sumita', 'દિવ્યા': 'Divya', 'દદવ્યા': 'Divya',
    'સુમિત': 'Sumit', 'સુતમત': 'Sumit', 'સતુમત': 'Sumit', 'પથુ': 'Pathu', 'રમીલા': 'Ramila',
    'નારણ': 'Naran', 'ધના': 'Dhana', 'કપિલા': 'Kapila', 'કતપલા': 'Kapila', 'પૂનમ': 'Poonam', 'પનૂ મ': 'Poonam',
    'દેવયાની': 'Devyani', 'શુભી': 'Shubhi', 'શભુ ી': 'Shubhi', 'હાર્દિક': 'Hardik', 'હાદદિક': 'Hardik',
    'રણછોડ': 'Ranchhod', 'દાના': 'Dana', 'બબી': 'Babi', 'શૈલેષ': 'Shailesh', 'પવન': 'Pavan',
    'વસી': 'Vasi', 'સંદીપ': 'Sandip', 'સાંદીપ': 'Sandip', 'સદાં ીપ': 'Sandip', 'ચેલા': 'Chela',
    'રાધા': 'Radha', 'હર્ષદ': 'Harshad', 'હષાદ': 'Harshad', 'ધ્રુવ': 'Dhruv', 'ગણેશ': 'Ganesh',
    'કુંવર': 'Kuvar', 'કુાંવર': 'Kuvar', 'અજુ': 'Aju', 'રામા': 'Rama', 'સમુ': 'Samu', 'સમબુ': 'Samu',
    'પ્રદીપ': 'Pradip', 'જીજ્ઞા': 'Jigna', 'મંજુલા': 'Manjula', 'માંજુલા': 'Manjula', 'મજાં ુલા': 'Manjula',
    'વાલા': 'Vala', 'વિવેક': 'Vivek', 'તવવેક': 'Vivek', 'સ્નેહા': 'Sneha', 'શાંતા': 'Shanta', 'શાંતત': 'Shanta', 'શાતાંત': 'Shanta',
    'નવીન': 'Navin', 'નતવન': 'Navin', 'અનિતા': 'Anita', 'અતનતા': 'Anita',
    'ખુશ્બુ': 'Khushbu', 'ખશ્ુબુ': 'Khushbu', 'દર્શન': 'Darshan', 'દશાન': 'Darshan',
    'પચાણ': 'Pachan', 'હસી': 'Hasi', 'ભારમલ': 'Bharmal', 'હરેશ': 'Haresh',
    'સિદ્ધરાજ': 'Siddhraj', 'તસદ્ધરાજ': 'Siddhraj', 'દજુ': 'Daju', 'અનિલ': 'Anil', 'અતનલ': 'Anil',
    'મેહુલ': 'Mehul', 'મોનિકા': 'Monika', 'મોતનકા': 'Monika', 'નિધિ': 'Nidhi', 'તનતધ': 'Nidhi',
    'ભીખા': 'Bhikha', 'ગોદડ': 'Godad', 'અંકિત': 'Ankit', 'અંદકત': 'Ankit',
    'રંજન': 'Ranjan', 'રાંજન': 'Ranjan', 'જગા': 'Jaga', 'ભગા': 'Bhaga', 'લીલી': 'Lili',
    'દશરથ': 'Dashrath', 'જગદીશ': 'Jagdish', 'ભવ્યરાજ': 'Bhavyaraj', 'મીતલ': 'Mital',
    'ભલા': 'Bhala', 'શારદા': 'Sharda', 'આરુ': 'Aaru', 'કાજલ': 'Kajal', 'જામા': 'Jama',
    'રેખા': 'Rekha', 'કમલેશ': 'Kamlesh', 'વનરાજ': 'Vanraj', 'લખમણ': 'Lakhaman',
    'મણી': 'Mani', 'આંબા': 'Amba', 'જેલી': 'Jeli', 'વિરરાજ': 'Virraj', 'તવરરાજ': 'Virraj',
    'ભવાન': 'Bhavan', 'રમેશ': 'Ramesh', 'ખોડા': 'Khoda', 'વરસાંગ': 'Varsang',
    'નબુ': 'Nabu', 'સંજય': 'Sanjay', 'સાંજય': 'Sanjay', 'સજાં ય': 'Sanjay', 'લાલી': 'Lali',
    'રણક્ષિત': 'Rakshit', 'રણક્ષત': 'Rakshit', 'ગોવા': 'Gova', 'શંકુ': 'Shanku', 'શાંકુ': 'Shanku', 'શકાં ુ': 'Shanku',
    'ભવ્ય': 'Bhavya', 'ગેલા': 'Gela', 'પરબત': 'Parbat', 'રોહિત': 'Rohit', 'રોદહત': 'Rohit',
    'જેન્સી': 'Jensi', 'ઋત્વિક': 'Rutvik', 'ઋત્ત્વક': 'Rutvik', 'નરસંગ': 'Narsang', 'નરસગાં': 'Narsang',
    'દિવ્યરાજ': 'Divyaraj', 'પીન્ટુ': 'Pintu', 'જેઠી': 'Jethi', 'કનુ': 'Kanu', 'કનભુ': 'Kanu',
    'અંજુ': 'Anju', 'શૌર્ય': 'Shaurya', 'હરી': 'Hari', 'ગાયત્રી': 'Gayatri', 'નિર્ભય': 'Nirbhay', 'તનભાય': 'Nirbhay',
    'રાજુ': 'Raju', 'વૈદેહી': 'Vaidehi', 'લક્ષ્મણ': 'Laxman', 'કલ્પના': 'Kalpana', 'ઋષિકેશ': 'Rishikesh', 'ઋતષકેશ': 'Rishikesh',
    'જેસંગ': 'Jesang', 'જેસગાં': 'Jesang', 'ઉદય': 'Uday', 'રાજેશ': 'Rajesh', 'ઉષા': 'Usha',
    'રોહાની': 'Rohani', 'અરવિંદ': 'Arvind', 'અરતવિંદ': 'Arvind', 'નયના': 'Nayana',
    'દિનેશ': 'Dinesh', 'ગીતા': 'Gita', 'હિરલ': 'Hiral', 'દહરલ': 'Hiral',
    'હર્ષિત': 'Harshit', 'હતષિત': 'Harshit', 'શ્રેયાન્સી': 'Shreyansi', 'જયમિત': 'Jaymit', 'જયતમત': 'Jaymit',
    'રીતેશ': 'Ritesh', 'હસમુખ': 'Hasmukh', 'હસમખુ': 'Hasmukh', 'હીના': 'Hina',
    'કુંતલ': 'Kuntal', 'કુાંતલ': 'Kuntal', 'મુળી': 'Muli', 'મળુ ી': 'Muli', 'જલ્પા': 'Jalpa',
    'માયા': 'Maya', 'પ્રજ્ઞેશ': 'Pragnesh', 'પૂજા': 'Puja', 'પજાૂ': 'Puja', 'રવિના': 'Ravina', 'રતવના': 'Ravina',
    'તેજી': 'Teji', 'ધની': 'Dhani', 'બચુ': 'Bachu', 'બચભુ': 'Bachu', 'શ્રદ્ધા': 'Shraddha', 'શ્રધ્ધા': 'Shraddha',
    'ભૂમિકા': 'Bhumika', 'ભતૂમકા': 'Bhumika', 'આયુષી': 'Aayushi', 'સંયમ': 'Sanyam', 'સયાં મ': 'Sanyam',
    'હીરા': 'Hira', 'જયેશ': 'Jayesh', 'જીયાન્સી': 'Jiyansi', 'મનોજ': 'Manoj',
    'નીતા': 'Nita', 'મનસ્વી': 'Manasvi', 'દેવા': 'Deva', 'જયા': 'Jaya',
    'પંકજ': 'Pankaj', 'પકાં જ': 'Pankaj', 'જૈનિલ': 'Jainil', 'જૈતનલ': 'Jainil', 'દેવાંશી': 'Devanshi', 'દેવાશાં ી': 'Devanshi',
    'પૃથ્વીરાજ': 'Prithviraj', 'નીતિન': 'Nitin', 'નીતતન': 'Nitin', 'જાનકી': 'Janki',
    'સમરત': 'Samrat', 'સની': 'Sunny', 'રીટા': 'Rita', 'મનીષા': 'Manisha',
    'ધર્મેન્દ્ર': 'Dharmendra', 'ધમેન્ર': 'Dharmendra', 'ધર્મેશ્રી': 'Dharmeshri', 'સમ્રાટ': 'Samrat',
    'ધીરજ': 'Dhiraj', 'નિકિતા': 'Nikita', 'તનદકતા': 'Nikita', 'વસંતી': 'Vasanti', 'વસતાં ી': 'Vasanti',
    'મિલાન': 'Milan', 'તમલન': 'Milan', 'સંજના': 'Sanjana', 'સજાં ના': 'Sanjana',
    'સંધ્યા': 'Sandhya', 'સધ્ાં યા': 'Sandhya', 'વંદના': 'Vandana', 'વદાં ના': 'Vandana',
    'ગોટુ': 'Gotu', 'પાયલ': 'Payal', 'નરેશ': 'Naresh', 'વિપુલ': 'Vipul', 'તવપલુ': 'Vipul',
    'ચંચી': 'Chanchi', 'ચચાં ી': 'Chanchi', 'ધ્રુવી': 'Dhruvi', 'અર્થીના': 'Arthina', 'અિીના': 'Arthina',
    'જયપાલ': 'Jaypal', 'રૂખી': 'Rukhi', 'મલુ': 'Malu', 'લક્ષ્મી': 'Laxmi',
    'કાલુ': 'Kalu', 'નેન્સી': 'Nency', 'નરેન્દ્ર': 'Narendra', 'કાંચન': 'Kanchan',
    'સાક્ષી': 'Sakshi', 'ધૈર્યવીર': 'Dhairyaveer', 'કિરીટ': 'Kirit', 'દકરીટ': 'Kirit',
    'પારસ': 'Paras', 'રવિ': 'Ravi', 'રતવ': 'Ravi', 'વિવા': 'Vivi', 'તવિા': 'Vivi'
};

const cMap = {
    'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
    'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'zh',
    'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
    'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
    'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
    'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v',
    'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h'
};
const vMap = {
    'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ૃ': 'ru',
    'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au'
};

function phoneticFallback(w) {
    let clean = w.replace(/ાં/g, 'n').replace(/ં/g, 'n').replace(/ાાં/g, 'an');
    let out = '';
    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i];
        const next = clean[i + 1];
        if (vMap[ch]) {
            out += vMap[ch];
        } else if (ch === '્') {
            // halant
        } else if (cMap[ch]) {
            out += cMap[ch];
            if (!vMap[next] && next !== '્' && i < clean.length - 1) {
                out += 'a';
            }
        } else if (/[a-zA-Z0-9]/.test(ch)) {
            out += ch;
        }
    }
    return out ? out.charAt(0).toUpperCase() + out.slice(1) : w;
}

function transliterateToken(token) {
    token = token.trim();
    if (!token) return '';
    // direct match
    if (atakMap[token]) return atakMap[token].en;
    if (curatedNames[token]) return curatedNames[token];

    // check suffixes
    for (const suf of ['ભાઈ', 'બેન', 'કુમાર', 'સિંહ', 'બા', 'રાજ', 'લાલ']) {
        if (token.endsWith(suf)) {
            const stem = token.substring(0, token.length - suf.length);
            const sufEn = suf === 'ભાઈ' ? 'bhai' : suf === 'બેન' ? 'ben' : suf === 'કુમાર' ? 'kumar' : suf === 'સિંહ' ? 'sinh' : suf === 'બા' ? 'ba' : suf === 'રાજ' ? 'raj' : 'lal';
            const stemEn = curatedNames[stem] || phoneticFallback(stem);
            return stemEn + sufEn;
        }
    }

    return phoneticFallback(token);
}

function cleanAndTransliterateFullName(fullNameGu, atakGu) {
    let gu = fullNameGu.replace(/પૌત્ર$/g, '').replace(/--/g, '').trim();
    if (atakGu && !gu.startsWith(atakGu)) {
        gu = atakGu + ' ' + gu;
    }
    const tokens = gu.split(/\s+/).filter(Boolean);
    const enTokens = tokens.map(transliterateToken);
    return {
        gu,
        en: enTokens.join(' ')
    };
}

function cleanDraftFile() {
    console.log('[FixDraft] Loading draft JSON...');
    const rawData = fs.readFileSync(DRAFT_PATH, 'utf-8');
    const families = JSON.parse(rawData);

    console.log(`[FixDraft] Processing ${families.length} families...`);

    let totalMembersCleaned = 0;

    for (let f of families) {
        // 1. Correct Atak
        const atakInfo = atakMap[f.atak.gu] || atakMap['ચાવડા'];
        f.atak.en = atakInfo.en;
        f.atak.gu = atakInfo.gu;

        // 2. Correct Kuldevi
        f.kuldevi.en = atakInfo.kuldeviEn;
        f.kuldevi.gu = atakInfo.kuldeviGu;

        // 3. Correct Address
        f.address.nativeVillage = { gu: 'બાસ્પા', en: 'Baspa' };

        let rawCityGu = f.address.currentCity?.gu || 'બાસ્પા';
        // if rawCity contains a phone number like "9427682068પુરુષ"
        if (/[0-9]/.test(rawCityGu) || rawCityGu.includes('પુરુષ') || rawCityGu.includes('સ્ત્રી')) {
            const numMatch = rawCityGu.match(/[0-9]{10}/);
            if (numMatch && !f.primaryMobile) {
                f.primaryMobile = numMatch[0];
            }
            rawCityGu = 'બાસ્પા';
        }
        const cityInfo = cityMap[rawCityGu] || { gu: rawCityGu, en: transliterateToken(rawCityGu) };
        f.address.currentCity = { gu: cityInfo.gu, en: cityInfo.en };

        // 4. Correct Members
        for (let m of f.members) {
            totalMembersCleaned++;

            // Clean Name
            const cleanedName = cleanAndTransliterateFullName(m.fullName.gu, f.atak.gu);
            m.fullName.gu = cleanedName.gu;
            m.fullName.en = cleanedName.en;

            // Clean Relation
            const relInfo = relationMap[m.relationWithHead.gu] || relationMap['પોતે'];
            m.relationWithHead = { gu: relInfo.gu, en: relInfo.en };

            // Clean Gender
            if (m.gender.key === 'male') {
                m.gender = { key: 'male', gu: 'પુરુષ' };
            } else {
                m.gender = { key: 'female', gu: 'સ્ત્રી' };
            }

            // Clean Marital Status
            if (m.maritalStatus.key === 'unknown' || !m.maritalStatus.key || !m.maritalStatus.gu) {
                if (m.relationWithHead.en === 'Wife' || (m.isFamilyHead && m.age >= 25)) {
                    m.maritalStatus = { key: 'married', gu: 'પરણિત' };
                } else if (m.education?.isStudying || m.age < 20 || m.relationWithHead.en.includes('Grand')) {
                    m.maritalStatus = { key: 'unmarried', gu: 'અપરણિત' };
                } else {
                    m.maritalStatus = { key: 'married', gu: 'પરણિત' };
                }
            } else if (m.maritalStatus.gu === 'પરણણત' || m.maritalStatus.gu === 'પરણિત') {
                m.maritalStatus = { key: 'married', gu: 'પરણિત' };
            } else if (m.maritalStatus.gu === 'અપરણણત' || m.maritalStatus.gu === 'અપરણિત') {
                m.maritalStatus = { key: 'unmarried', gu: 'અપરણિત' };
            } else if (m.maritalStatus.gu.includes('વિધવા')) {
                m.maritalStatus = { key: 'widow', gu: 'વિધવા' };
            } else if (m.maritalStatus.gu.includes('વિધુર')) {
                m.maritalStatus = { key: 'widower', gu: 'વિધુર' };
            }

            // Clean Occupation
            if (m.occupation) {
                let occCity = m.occupation.workCity || f.address.currentCity.gu;
                if (/[0-9]/.test(occCity) || occCity.includes('પુરુષ') || occCity.includes('સ્ત્રી')) {
                    occCity = 'બાસ્પા';
                }
                m.occupation.workCity = occCity;

                if (m.occupation.title.includes('ખેતી')) {
                    m.occupation.title = 'ખેતી';
                    m.occupation.category = 'agriculture';
                } else if (m.occupation.title.includes('ઘરકામ')) {
                    m.occupation.title = 'ઘરકામ';
                    m.occupation.category = 'homemaker';
                } else if (m.occupation.title.includes('અભ્યાસ') || m.education?.isStudying) {
                    m.occupation.title = 'અભ્યાસ';
                    m.occupation.category = 'student';
                } else if (m.occupation.title.includes('નોકરી')) {
                    m.occupation.title = 'નોકરી પ્રાઇવેટ';
                    m.occupation.category = 'private_job';
                } else if (m.occupation.title.includes('શિક્ષક') || m.occupation.title.includes('તશ્ષ')) {
                    m.occupation.title = 'શિક્ષક';
                    m.occupation.category = 'govt_job';
                } else if (m.occupation.title.includes('વેપાર') || m.occupation.title.includes('દુકાન')) {
                    m.occupation.title = 'વેપાર';
                    m.occupation.category = 'business';
                } else if (m.occupation.title.includes('મજુરી')) {
                    m.occupation.title = 'મજુરીકામ';
                    m.occupation.category = 'labour';
                }
            }

            // Clean Education qualification
            if (m.education) {
                if (m.education.qualification.includes('10')) m.education.qualification = '10th';
                else if (m.education.qualification.includes('12')) m.education.qualification = '12th';
                else if (m.education.qualification.includes('8')) m.education.qualification = '8th';
                else if (m.education.qualification.includes('5')) m.education.qualification = '5th';
                else if (m.education.qualification.includes('બી.એડ')) m.education.qualification = 'B.Ed';
                else if (m.education.qualification.includes('બી.એસસી')) m.education.qualification = 'B.Sc';
                else if (m.education.qualification.includes('બી.એ') || m.education.qualification === 'બીએ') m.education.qualification = 'B.A';
                else if (m.education.qualification.includes('પીટીસી')) m.education.qualification = 'PTC';
                else if (m.education.qualification.includes('એમબીબીએસ') || m.education.qualification === 'MBBS') m.education.qualification = 'MBBS';
                else if (m.education.qualification.includes('બીએએમએસ') || m.education.qualification === 'BAMS') m.education.qualification = 'BAMS';
                else if (m.education.qualification.includes('ડીપ્લોમા')) m.education.qualification = 'Diploma';
                else if (m.education.qualification.includes('ચાલુ')) {
                    m.education.qualification = 'Pursuing';
                    m.education.isStudying = true;
                }
            }
        }
    }

    console.log(`[FixDraft] Writing back cleaned data to ${DRAFT_PATH}...`);
    fs.writeFileSync(DRAFT_PATH, JSON.stringify(families, null, 2), 'utf-8');
    console.log(`[FixDraft] Successfully cleaned ${families.length} families and ${totalMembersCleaned} members!`);
}

cleanDraftFile();
