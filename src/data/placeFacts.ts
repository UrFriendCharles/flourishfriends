/**
 * Quick-reference facts for hints and the post-answer fact strip.
 * Countries: currency, founding/independence year, area (km²), population.
 * States: nickname, area (mi²), population, highest point (ft), avg temp (°F).
 * Figures are rounded public-reference values (world atlas / Census / USGS /
 * NOAA); populations are recent estimates, so treat them as "about".
 */

export interface CountryFacts {
  currency: string;
  /** founding, unification or independence year, as usually cited */
  founded: string;
  areaKm2: number;
  population: number;
}

export interface StateFacts {
  nickname: string;
  areaMi2: number;
  population: number;
  highestFt: number;
  avgTempF: number;
}

type C = [currency: string, founded: string, areaKm2: number, population: number];

const COUNTRY_ROWS: Record<string, C> = {
  "united-states": ["US dollar", "1776", 9833520, 335e6],
  canada: ["Canadian dollar", "1867", 9984670, 40e6],
  brazil: ["Brazilian real", "1822", 8515767, 212e6],
  japan: ["Japanese yen", "660 BC (legend)", 377975, 124e6],
  france: ["Euro", "843", 551695, 68e6],
  "united-kingdom": ["Pound sterling", "1707", 243610, 68e6],
  germany: ["Euro", "1871", 357592, 84e6],
  italy: ["Euro", "1861", 301340, 59e6],
  spain: ["Euro", "1479", 505990, 48e6],
  china: ["Renminbi (yuan)", "221 BC", 9596961, 1.41e9],
  india: ["Indian rupee", "1947", 3287263, 1.43e9],
  mexico: ["Mexican peso", "1821", 1964375, 129e6],
  australia: ["Australian dollar", "1901", 7692024, 27e6],
  "south-africa": ["South African rand", "1910", 1221037, 63e6],
  jamaica: ["Jamaican dollar", "1962", 10991, 2.8e6],
  "south-korea": ["South Korean won", "1948", 100210, 51.7e6],
  russia: ["Russian ruble", "862", 17098246, 144e6],
  argentina: ["Argentine peso", "1816", 2780400, 46e6],
  egypt: ["Egyptian pound", "1922", 1002450, 112e6],
  greece: ["Euro", "1821", 131957, 10.4e6],
  sweden: ["Swedish krona", "1523", 450295, 10.5e6],
  switzerland: ["Swiss franc", "1291", 41285, 8.9e6],
  turkey: ["Turkish lira", "1923", 783562, 85e6],
  kenya: ["Kenyan shilling", "1963", 580367, 55e6],
  nigeria: ["Nigerian naira", "1960", 923768, 224e6],
  "saudi-arabia": ["Saudi riyal", "1932", 2149690, 33e6],
  israel: ["Israeli new shekel", "1948", 22145, 9.8e6],
  portugal: ["Euro", "1143", 92212, 10.4e6],
  netherlands: ["Euro", "1581", 41850, 17.9e6],
  belgium: ["Euro", "1830", 30689, 11.8e6],
  ireland: ["Euro", "1922", 70273, 5.3e6],
  norway: ["Norwegian krone", "872", 385207, 5.5e6],
  denmark: ["Danish krone", "c. 950", 42943, 5.9e6],
  finland: ["Euro", "1917", 338455, 5.6e6],
  poland: ["Polish złoty", "966", 312696, 37.6e6],
  austria: ["Euro", "1918", 83879, 9.1e6],
  ukraine: ["Ukrainian hryvnia", "1991", 603550, 37e6],
  czechia: ["Czech koruna", "1993", 78871, 10.9e6],
  hungary: ["Hungarian forint", "1000", 93028, 9.6e6],
  romania: ["Romanian leu", "1859", 238397, 19e6],
  colombia: ["Colombian peso", "1810", 1141748, 52e6],
  peru: ["Peruvian sol", "1821", 1285216, 34e6],
  chile: ["Chilean peso", "1818", 756102, 19.6e6],
  venezuela: ["Venezuelan bolívar", "1811", 916445, 28e6],
  cuba: ["Cuban peso", "1902", 109884, 11e6],
  thailand: ["Thai baht", "1238", 513120, 71.8e6],
  vietnam: ["Vietnamese đồng", "1945", 331212, 100e6],
  philippines: ["Philippine peso", "1898", 300000, 115e6],
  indonesia: ["Indonesian rupiah", "1945", 1904569, 278e6],
  pakistan: ["Pakistani rupee", "1947", 881913, 241e6],
  iran: ["Iranian rial", "550 BC", 1648195, 89e6],
  iraq: ["Iraqi dinar", "1932", 438317, 45e6],
  morocco: ["Moroccan dirham", "1956", 446550, 37e6],
  ethiopia: ["Ethiopian birr", "Ancient — never colonized", 1104300, 127e6],
  ghana: ["Ghanaian cedi", "1957", 238533, 34e6],
  "new-zealand": ["New Zealand dollar", "1907", 268021, 5.2e6],
  croatia: ["Euro", "1991", 56594, 3.9e6],
  ecuador: ["US dollar", "1830", 283561, 18e6],
  chad: ["Central African CFA franc", "1960", 1284000, 18e6],
  moldova: ["Moldovan leu", "1991", 33846, 2.5e6],
  andorra: ["Euro", "1278", 468, 83e3],
  monaco: ["Euro", "1297", 2, 38e3],
  luxembourg: ["Euro", "963", 2586, 660e3],
  mali: ["West African CFA franc", "1960", 1240192, 23e6],
  guinea: ["Guinean franc", "1958", 245857, 14e6],
  "ivory-coast": ["West African CFA franc", "1960", 322463, 29e6],
  senegal: ["West African CFA franc", "1960", 196722, 18e6],
  cameroon: ["Central African CFA franc", "1960", 475442, 28e6],
  botswana: ["Botswana pula", "1966", 581730, 2.6e6],
  lesotho: ["Lesotho loti", "1966", 30355, 2.3e6],
  eswatini: ["Swazi lilangeni", "1968", 17364, 1.2e6],
  kazakhstan: ["Kazakhstani tenge", "1991", 2724900, 20e6],
  uzbekistan: ["Uzbek som", "1991", 448978, 36e6],
  turkmenistan: ["Turkmen manat", "1991", 491210, 6.5e6],
  kyrgyzstan: ["Kyrgyz som", "1991", 199951, 7e6],
  tajikistan: ["Tajik somoni", "1991", 143100, 10e6],
  fiji: ["Fijian dollar", "1970", 18274, 930e3],
  vanuatu: ["Vanuatu vatu", "1980", 12189, 330e3],
  barbados: ["Barbadian dollar", "1966", 430, 282e3],
  "trinidad-and-tobago": ["Trinidad and Tobago dollar", "1962", 5131, 1.5e6],
  "saint-lucia": ["East Caribbean dollar", "1979", 617, 180e3],
  nepal: ["Nepalese rupee", "1768", 147516, 30e6],
  slovenia: ["Euro", "1991", 20273, 2.1e6],
  slovakia: ["Euro", "1993", 49035, 5.4e6],
  iceland: ["Icelandic króna", "1944", 103000, 390e3],
  estonia: ["Euro", "1918", 45339, 1.37e6],
  latvia: ["Euro", "1918", 64589, 1.88e6],
  lithuania: ["Euro", "1918", 65300, 2.9e6],
  belarus: ["Belarusian ruble", "1991", 207600, 9.2e6],
  serbia: ["Serbian dinar", "1878", 77474, 6.6e6],
  "bosnia-and-herzegovina": ["Convertible mark", "1992", 51197, 3.2e6],
  montenegro: ["Euro", "2006", 13812, 620e3],
  "north-macedonia": ["Macedonian denar", "1991", 25713, 1.8e6],
  albania: ["Albanian lek", "1912", 28748, 2.8e6],
  bulgaria: ["Euro", "681", 110994, 6.4e6],
  malta: ["Euro", "1964", 316, 540e3],
  cyprus: ["Euro", "1960", 9251, 1.3e6],
  "san-marino": ["Euro", "301", 61, 34e3],
  liechtenstein: ["Swiss franc", "1719", 160, 40e3],
  "vatican-city": ["Euro", "1929", 0.49, 800],
  mongolia: ["Mongolian tögrög", "1206", 1564116, 3.4e6],
  "north-korea": ["North Korean won", "1948", 120538, 26e6],
  malaysia: ["Malaysian ringgit", "1957", 330803, 34e6],
  singapore: ["Singapore dollar", "1965", 734, 5.9e6],
  myanmar: ["Myanmar kyat", "1948", 676578, 54e6],
  laos: ["Lao kip", "1953", 236800, 7.6e6],
  cambodia: ["Cambodian riel", "1953", 181035, 17e6],
  brunei: ["Brunei dollar", "1984", 5765, 450e3],
  "timor-leste": ["US dollar", "2002", 14874, 1.4e6],
  bangladesh: ["Bangladeshi taka", "1971", 148460, 173e6],
  "sri-lanka": ["Sri Lankan rupee", "1948", 65610, 22e6],
  bhutan: ["Bhutanese ngultrum", "1907", 38394, 780e3],
  maldives: ["Maldivian rufiyaa", "1965", 298, 520e3],
  afghanistan: ["Afghan afghani", "1747", 652864, 41e6],
  armenia: ["Armenian dram", "1991", 29743, 2.8e6],
  azerbaijan: ["Azerbaijani manat", "1991", 86600, 10e6],
  georgia: ["Georgian lari", "1991", 69700, 3.7e6],
  syria: ["Syrian pound", "1946", 185180, 23e6],
  lebanon: ["Lebanese pound", "1943", 10452, 5.3e6],
  jordan: ["Jordanian dinar", "1946", 89342, 11.3e6],
  palestine: ["Israeli shekel & Jordanian dinar", "1988", 6020, 5.4e6],
  yemen: ["Yemeni rial", "1990", 527968, 34e6],
  oman: ["Omani rial", "1650", 309500, 4.6e6],
  "united-arab-emirates": ["UAE dirham", "1971", 83600, 10e6],
  qatar: ["Qatari riyal", "1971", 11586, 2.7e6],
  bahrain: ["Bahraini dinar", "1971", 780, 1.5e6],
  kuwait: ["Kuwaiti dinar", "1961", 17818, 4.3e6],
  algeria: ["Algerian dinar", "1962", 2381741, 46e6],
  tunisia: ["Tunisian dinar", "1956", 163610, 12.3e6],
  libya: ["Libyan dinar", "1951", 1759540, 7e6],
  sudan: ["Sudanese pound", "1956", 1861484, 48e6],
  "south-sudan": ["South Sudanese pound", "2011", 619745, 11e6],
  eritrea: ["Eritrean nakfa", "1993", 121100, 3.7e6],
  djibouti: ["Djiboutian franc", "1977", 23200, 1.1e6],
  somalia: ["Somali shilling", "1960", 637657, 18e6],
  uganda: ["Ugandan shilling", "1962", 241550, 48e6],
  tanzania: ["Tanzanian shilling", "1961", 947303, 67e6],
  rwanda: ["Rwandan franc", "1962", 26338, 14e6],
  burundi: ["Burundian franc", "1962", 27834, 13e6],
  "democratic-republic-of-the-congo": ["Congolese franc", "1960", 2344858, 105e6],
  "republic-of-the-congo": ["Central African CFA franc", "1960", 342000, 6e6],
  "central-african-republic": ["Central African CFA franc", "1960", 622984, 5.7e6],
  gabon: ["Central African CFA franc", "1960", 267668, 2.4e6],
  "equatorial-guinea": ["Central African CFA franc", "1968", 28051, 1.7e6],
  "sao-tome-and-principe": ["São Tomé dobra", "1975", 964, 230e3],
  angola: ["Angolan kwanza", "1975", 1246700, 37e6],
  zambia: ["Zambian kwacha", "1964", 752612, 21e6],
  zimbabwe: ["Zimbabwe Gold (ZiG)", "1980", 390757, 16.6e6],
  malawi: ["Malawian kwacha", "1964", 118484, 21e6],
  mozambique: ["Mozambican metical", "1975", 801590, 34e6],
  namibia: ["Namibian dollar", "1990", 825615, 3e6],
  madagascar: ["Malagasy ariary", "1960", 587041, 31e6],
  mauritius: ["Mauritian rupee", "1968", 2040, 1.26e6],
  seychelles: ["Seychellois rupee", "1976", 459, 120e3],
  comoros: ["Comorian franc", "1975", 1861, 850e3],
  "cabo-verde": ["Cape Verdean escudo", "1975", 4033, 600e3],
  "burkina-faso": ["West African CFA franc", "1960", 274200, 23e6],
  niger: ["West African CFA franc", "1960", 1267000, 27e6],
  benin: ["West African CFA franc", "1960", 114763, 14e6],
  togo: ["West African CFA franc", "1960", 56785, 9e6],
  liberia: ["Liberian dollar", "1847", 111369, 5.4e6],
  "sierra-leone": ["Sierra Leonean leone", "1961", 71740, 8.6e6],
  "guinea-bissau": ["West African CFA franc", "1973", 36125, 2.1e6],
  "the-gambia": ["Gambian dalasi", "1965", 11295, 2.7e6],
  mauritania: ["Mauritanian ouguiya", "1960", 1030700, 4.9e6],
  guatemala: ["Guatemalan quetzal", "1821", 108889, 18e6],
  belize: ["Belize dollar", "1981", 22966, 410e3],
  honduras: ["Honduran lempira", "1821", 112492, 10.6e6],
  "el-salvador": ["US dollar", "1821", 21041, 6.3e6],
  nicaragua: ["Nicaraguan córdoba", "1821", 130375, 7e6],
  "costa-rica": ["Costa Rican colón", "1821", 51100, 5.2e6],
  panama: ["Panamanian balboa & US dollar", "1903", 75417, 4.5e6],
  haiti: ["Haitian gourde", "1804", 27750, 11.7e6],
  "dominican-republic": ["Dominican peso", "1844", 48671, 11.3e6],
  bahamas: ["Bahamian dollar", "1973", 13943, 410e3],
  "antigua-and-barbuda": ["East Caribbean dollar", "1981", 442, 94e3],
  dominica: ["East Caribbean dollar", "1978", 751, 73e3],
  grenada: ["East Caribbean dollar", "1974", 344, 126e3],
  "saint-kitts-and-nevis": ["East Caribbean dollar", "1983", 261, 47e3],
  "saint-vincent-and-the-grenadines": ["East Caribbean dollar", "1979", 389, 104e3],
  bolivia: ["Bolivian boliviano", "1825", 1098581, 12.4e6],
  paraguay: ["Paraguayan guaraní", "1811", 406752, 6.9e6],
  uruguay: ["Uruguayan peso", "1825", 176215, 3.4e6],
  guyana: ["Guyanese dollar", "1966", 214969, 800e3],
  suriname: ["Surinamese dollar", "1975", 163820, 620e3],
  "papua-new-guinea": ["Papua New Guinean kina", "1975", 462840, 10e6],
  "solomon-islands": ["Solomon Islands dollar", "1978", 28896, 740e3],
  samoa: ["Samoan tālā", "1962", 2842, 220e3],
  tonga: ["Tongan paʻanga", "1970", 747, 105e3],
  tuvalu: ["Australian dollar", "1978", 26, 11e3],
  kiribati: ["Australian dollar", "1979", 811, 130e3],
  nauru: ["Australian dollar", "1968", 21, 12e3],
  palau: ["US dollar", "1994", 459, 18e3],
  micronesia: ["US dollar", "1986", 702, 115e3],
  "marshall-islands": ["US dollar", "1986", 181, 42e3],
};

type S = [nickname: string, areaMi2: number, population: number, highestFt: number, avgTempF: number];

const STATE_ROWS: Record<string, S> = {
  alabama: ["Yellowhammer State", 52420, 5.0e6, 2413, 62.8],
  alaska: ["The Last Frontier", 665384, 733e3, 20310, 26.6],
  arizona: ["Grand Canyon State", 113990, 7.2e6, 12633, 60.3],
  arkansas: ["The Natural State", 53179, 3.0e6, 2753, 60.4],
  california: ["Golden State", 163695, 39.5e6, 14505, 59.4],
  colorado: ["Centennial State", 104094, 5.8e6, 14440, 45.1],
  connecticut: ["Constitution State", 5543, 3.6e6, 2380, 49.0],
  delaware: ["The First State", 2489, 990e3, 448, 55.3],
  florida: ["Sunshine State", 65758, 21.5e6, 345, 70.7],
  "georgia-us": ["Peach State", 59425, 10.7e6, 4784, 63.5],
  hawaii: ["Aloha State", 10932, 1.46e6, 13803, 70.0],
  idaho: ["Gem State", 83569, 1.84e6, 12662, 44.4],
  illinois: ["Prairie State", 57914, 12.8e6, 1235, 51.8],
  indiana: ["Hoosier State", 36420, 6.8e6, 1257, 51.7],
  iowa: ["Hawkeye State", 56273, 3.19e6, 1670, 47.8],
  kansas: ["Sunflower State", 82278, 2.94e6, 4039, 54.3],
  kentucky: ["Bluegrass State", 40408, 4.5e6, 4145, 55.6],
  louisiana: ["Pelican State", 52378, 4.66e6, 535, 66.4],
  maine: ["Pine Tree State", 35380, 1.36e6, 5267, 41.0],
  maryland: ["Old Line State", 12406, 6.18e6, 3360, 54.2],
  massachusetts: ["Bay State", 10554, 7.03e6, 3489, 47.9],
  michigan: ["Great Lakes State", 96714, 10.1e6, 1979, 44.4],
  minnesota: ["North Star State", 86936, 5.71e6, 2301, 41.2],
  mississippi: ["Magnolia State", 48432, 2.96e6, 806, 63.4],
  missouri: ["Show-Me State", 69707, 6.15e6, 1772, 54.5],
  montana: ["Treasure State", 147040, 1.08e6, 12799, 42.7],
  nebraska: ["Cornhusker State", 77348, 1.96e6, 5424, 48.8],
  nevada: ["Silver State", 110572, 3.1e6, 13147, 49.9],
  "new-hampshire": ["Granite State", 9349, 1.38e6, 6288, 43.8],
  "new-jersey": ["Garden State", 8723, 9.29e6, 1803, 52.7],
  "new-mexico": ["Land of Enchantment", 121590, 2.12e6, 13161, 53.4],
  "new-york": ["Empire State", 54555, 20.2e6, 5344, 45.4],
  "north-carolina": ["Tar Heel State", 53819, 10.4e6, 6684, 59.0],
  "north-dakota": ["Peace Garden State", 70698, 779e3, 3506, 40.4],
  ohio: ["Buckeye State", 44826, 11.8e6, 1549, 50.7],
  oklahoma: ["Sooner State", 69899, 3.96e6, 4973, 59.6],
  oregon: ["Beaver State", 98379, 4.24e6, 11249, 48.4],
  pennsylvania: ["Keystone State", 46054, 13.0e6, 3213, 48.8],
  "rhode-island": ["Ocean State", 1545, 1.1e6, 812, 50.1],
  "south-carolina": ["Palmetto State", 32020, 5.12e6, 3560, 62.4],
  "south-dakota": ["Mount Rushmore State", 77116, 887e3, 7242, 45.2],
  tennessee: ["Volunteer State", 42144, 6.91e6, 6643, 57.6],
  texas: ["Lone Star State", 268596, 29.1e6, 8751, 64.8],
  utah: ["Beehive State", 84897, 3.27e6, 13528, 48.6],
  vermont: ["Green Mountain State", 9616, 643e3, 4393, 42.9],
  virginia: ["Old Dominion", 42775, 8.63e6, 5729, 55.1],
  washington: ["Evergreen State", 71298, 7.71e6, 14411, 48.3],
  "west-virginia": ["Mountain State", 24230, 1.79e6, 4863, 51.8],
  wisconsin: ["Badger State", 65496, 5.89e6, 1951, 43.1],
  wyoming: ["Equality State", 97813, 577e3, 13804, 42.0],
};

export function countryFacts(id: string): CountryFacts | undefined {
  const row = COUNTRY_ROWS[id.replace(/^country-/, "")];
  if (!row) return undefined;
  const [currency, founded, areaKm2, population] = row;
  return { currency, founded, areaKm2, population };
}

export function stateFacts(id: string): StateFacts | undefined {
  const row = STATE_ROWS[id.replace(/^state-/, "")];
  if (!row) return undefined;
  const [nickname, areaMi2, population, highestFt, avgTempF] = row;
  return { nickname, areaMi2, population, highestFt, avgTempF };
}

/** 83000 -> "83K", 6910000 -> "6.9M", 1.41e9 -> "1.41B" */
export function formatPopulation(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

const KM2_PER_MI2 = 2.589988;

/** Area in both units, e.g. "468 km² (181 mi²)". */
export function formatArea(km2: number): string {
  const mi2 = km2 / KM2_PER_MI2;
  const fmt = (v: number) => (v < 10 ? String(+v.toFixed(2)) : Math.round(v).toLocaleString("en-US"));
  return `${fmt(km2)} km² (${fmt(mi2)} mi²)`;
}

export function formatStateArea(mi2: number): string {
  return `${mi2.toLocaleString("en-US")} mi² (${Math.round(mi2 * KM2_PER_MI2).toLocaleString("en-US")} km²)`;
}

/**
 * Capital hint text. Masking a capital like "Andorra la Vella" or "Singapore"
 * reads as nonsense, so those get a clear clue instead of the name.
 */
export function capitalHintText(place: { id: string; country: string; capital: string }): string {
  const safe = place.country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`\\b${safe}\\b`, "i").test(place.capital)) return place.capital;
  const noun = place.id.startsWith("state-") ? "state" : "country";
  return `It's named after the ${noun} itself!`;
}

/** "us-tn" -> "TN" */
export function postalCode(countryCode: string): string {
  return countryCode.replace(/^us-/, "").toUpperCase();
}
