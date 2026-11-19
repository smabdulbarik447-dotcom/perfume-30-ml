// Thikana theke jela ber kora (dashboard er জেলা লিডারবোর্ড) — bangla/english duitai, bhinno banan soho
const LIST = [
  ["ঢাকা", "ঢাকা", "dhaka"], ["গাজীপুর", "গাজীপুর", "গাজিপুর", "gazipur"], ["নারায়ণগঞ্জ", "নারায়ণগঞ্জ", "নারায়নগঞ্জ", "narayanganj"],
  ["নরসিংদী", "নরসিংদী", "নরসিংদি", "narsingdi"], ["মুন্সীগঞ্জ", "মুন্সীগঞ্জ", "মুন্সিগঞ্জ", "munshiganj"], ["মানিকগঞ্জ", "মানিকগঞ্জ", "manikganj"],
  ["টাঙ্গাইল", "টাঙ্গাইল", "টাংগাইল", "tangail"], ["কিশোরগঞ্জ", "কিশোরগঞ্জ", "kishoreganj", "kishorganj"], ["ফরিদপুর", "ফরিদপুর", "faridpur"],
  ["গোপালগঞ্জ", "গোপালগঞ্জ", "gopalganj"], ["মাদারীপুর", "মাদারীপুর", "মাদারিপুর", "madaripur"], ["শরীয়তপুর", "শরীয়তপুর", "শরিয়তপুর", "shariatpur"],
  ["রাজবাড়ী", "রাজবাড়ী", "রাজবাড়ি", "rajbari"], ["চট্টগ্রাম", "চট্টগ্রাম", "চট্রগ্রাম", "chattogram", "chittagong", "ctg"],
  ["কক্সবাজার", "কক্সবাজার", "cox"], ["কুমিল্লা", "কুমিল্লা", "cumilla", "comilla"], ["ফেনী", "ফেনী", "ফেনি", "feni"],
  ["নোয়াখালী", "নোয়াখালী", "নোয়াখালি", "noakhali"], ["লক্ষ্মীপুর", "লক্ষ্মীপুর", "লক্ষীপুর", "lakshmipur", "laxmipur"],
  ["চাঁদপুর", "চাঁদপুর", "চাদপুর", "chandpur"], ["ব্রাহ্মণবাড়িয়া", "ব্রাহ্মণবাড়িয়া", "বি-বাড়িয়া", "বিবাড়িয়া", "brahmanbaria"],
  ["রাঙ্গামাটি", "রাঙ্গামাটি", "রাঙামাটি", "rangamati"], ["খাগড়াছড়ি", "খাগড়াছড়ি", "khagrachari", "khagrachhari"], ["বান্দরবান", "বান্দরবান", "bandarban"],
  ["রাজশাহী", "রাজশাহী", "রাজশাহি", "rajshahi"], ["নাটোর", "নাটোর", "natore"], ["নওগাঁ", "নওগাঁ", "নওগা", "naogaon"],
  ["চাঁপাইনবাবগঞ্জ", "চাঁপাইনবাবগঞ্জ", "চাপাইনবাবগঞ্জ", "চাঁপাই", "chapai"], ["পাবনা", "পাবনা", "pabna"], ["সিরাজগঞ্জ", "সিরাজগঞ্জ", "sirajganj"],
  ["বগুড়া", "বগুড়া", "বগুরা", "bogura", "bogra"], ["জয়পুরহাট", "জয়পুরহাট", "joypurhat", "jaipurhat"], ["খুলনা", "খুলনা", "khulna"],
  ["যশোর", "যশোর", "jessore", "jashore"], ["সাতক্ষীরা", "সাতক্ষীরা", "satkhira"], ["বাগেরহাট", "বাগেরহাট", "bagerhat"],
  ["নড়াইল", "নড়াইল", "narail"], ["মাগুরা", "মাগুরা", "magura"], ["ঝিনাইদহ", "ঝিনাইদহ", "jhenaidah", "jhenidah"],
  ["কুষ্টিয়া", "কুষ্টিয়া", "kushtia"], ["চুয়াডাঙ্গা", "চুয়াডাঙ্গা", "chuadanga"], ["মেহেরপুর", "মেহেরপুর", "meherpur"],
  ["বরিশাল", "বরিশাল", "barishal", "barisal"], ["পটুয়াখালী", "পটুয়াখালী", "patuakhali"], ["ভোলা", "ভোলা", "bhola"],
  ["পিরোজপুর", "পিরোজপুর", "pirojpur"], ["ঝালকাঠি", "ঝালকাঠি", "ঝালকাঠী", "jhalokati", "jhalakathi"], ["বরগুনা", "বরগুনা", "barguna"],
  ["সিলেট", "সিলেট", "sylhet"], ["মৌলভীবাজার", "মৌলভীবাজার", "মৌলভিবাজার", "moulvibazar"], ["হবিগঞ্জ", "হবিগঞ্জ", "habiganj"],
  ["সুনামগঞ্জ", "সুনামগঞ্জ", "sunamganj"], ["রংপুর", "রংপুর", "rangpur"], ["দিনাজপুর", "দিনাজপুর", "dinajpur"],
  ["গাইবান্ধা", "গাইবান্ধা", "gaibandha"], ["কুড়িগ্রাম", "কুড়িগ্রাম", "kurigram"], ["লালমনিরহাট", "লালমনিরহাট", "lalmonirhat"],
  ["নীলফামারী", "নীলফামারী", "নীলফামারি", "nilphamari"], ["পঞ্চগড়", "পঞ্চগড়", "panchagarh"], ["ঠাকুরগাঁও", "ঠাকুরগাঁও", "ঠাকুরগাও", "thakurgaon"],
  ["ময়মনসিংহ", "ময়মনসিংহ", "মোমেনশাহী", "mymensingh"], ["জামালপুর", "জামালপুর", "jamalpur"], ["নেত্রকোনা", "নেত্রকোনা", "netrokona", "netrakona"],
  ["শেরপুর", "শেরপুর", "sherpur"],
];
// Jela na likhe shudhu elaka likhle (Dhaka shohorer porichito jayga)
const DHAKA_AREAS = ["মিরপুর", "উত্তরা", "মোহাম্মদপুর", "ধানমন্ডি", "বাড্ডা", "গুলশান", "যাত্রাবাড়ী", "মতিঝিল", "সাভার", "কেরানীগঞ্জ", "খিলগাঁও", "রামপুরা", "মালিবাগ", "বনানী", "তেজগাঁও",
  "mirpur", "uttara", "mohammadpur", "dhanmondi", "badda", "gulshan", "jatrabari", "motijheel", "savar", "keraniganj", "khilgaon", "rampura", "banani"];

const norm = (s) => String(s || "").normalize("NFC").toLowerCase();
const KEYS = LIST.map(([name, ...keys]) => [name, keys.map(norm)]);
const DHAKA = DHAKA_AREAS.map(norm);

/** Thikana theke jela (thikana sadharonoto choto → boro, tai shobcheye pichoner mil ta nei); na pele area diye bujhi */
export function districtOf(address, area) {
  const a = norm(address);
  let best = null;
  let at = -1;
  for (const [name, keys] of KEYS) {
    for (const k of keys) {
      const i = a.lastIndexOf(k);
      if (i > at) { at = i; best = name; }
    }
  }
  if (best) return best;
  if (area === "inside" || DHAKA.some((k) => a.includes(k))) return "ঢাকা";
  return null;
}

// Jelar shodor er moto jayga (akkhangsho, drighangsho) — dashboard er map e bubble boshate
const LATLNG = {
  dhaka: [23.81, 90.41], gazipur: [24.0, 90.42], narayanganj: [23.62, 90.5], narsingdi: [23.92, 90.72], munshiganj: [23.54, 90.53],
  manikganj: [23.86, 90.0], tangail: [24.25, 89.92], kishoreganj: [24.44, 90.78], faridpur: [23.61, 89.84], gopalganj: [23.01, 89.83],
  madaripur: [23.17, 90.2], shariatpur: [23.21, 90.35], rajbari: [23.76, 89.64], chattogram: [22.36, 91.78], chittagong: [22.36, 91.78],
  cox: [21.43, 92.01], cumilla: [23.46, 91.18], feni: [23.02, 91.4], noakhali: [22.87, 91.1], lakshmipur: [22.94, 90.83],
  chandpur: [23.23, 90.67], brahmanbaria: [23.96, 91.11], rangamati: [22.65, 92.18], khagrachari: [23.12, 91.98], bandarban: [22.2, 92.22],
  rajshahi: [24.37, 88.6], natore: [24.42, 89.0], naogaon: [24.8, 88.94], chapai: [24.6, 88.27], pabna: [24.01, 89.24],
  sirajganj: [24.45, 89.7], bogura: [24.85, 89.37], joypurhat: [25.1, 89.02], khulna: [22.82, 89.55], jessore: [23.17, 89.21],
  satkhira: [22.72, 89.07], bagerhat: [22.65, 89.79], narail: [23.17, 89.51], magura: [23.49, 89.42], jhenaidah: [23.54, 89.17],
  kushtia: [23.9, 89.12], chuadanga: [23.64, 88.84], meherpur: [23.76, 88.63], barishal: [22.7, 90.37], patuakhali: [22.36, 90.33],
  bhola: [22.69, 90.65], pirojpur: [22.58, 89.97], jhalokati: [22.64, 90.2], barguna: [22.15, 90.13], sylhet: [24.89, 91.87],
  moulvibazar: [24.48, 91.78], habiganj: [24.37, 91.42], sunamganj: [25.07, 91.4], rangpur: [25.74, 89.28], dinajpur: [25.63, 88.64],
  gaibandha: [25.33, 89.54], kurigram: [25.81, 89.64], lalmonirhat: [25.92, 89.45], nilphamari: [25.93, 88.86], panchagarh: [26.34, 88.55],
  thakurgaon: [26.03, 88.46], mymensingh: [24.75, 90.41], jamalpur: [24.92, 89.95], netrokona: [24.88, 90.73], sherpur: [25.02, 90.02],
};
/** Jelar nam (Bangla) → [lat, lng] — English banan diye khuje */
export function districtLatLng(name) {
  const keys = KEYS.find(([n]) => n === name)?.[1] || [];
  for (const k of keys) if (LATLNG[k]) return LATLNG[k];
  return null;
}
