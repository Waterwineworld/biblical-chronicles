// ═══════════════════════════════════════════════════════════════
//  DATA.JS — Episode data, question banks, game constants
// ═══════════════════════════════════════════════════════════════

// ── Episode data ──────────────────────────────────────────────
const EPS=[
{id:'david-goliath',icon:'🪨',num:'Episode I',title:'The Shepherd Who Slew a Giant',book:'1 Samuel 17',desc:'A boy, a sling, and the God of Israel. One of the greatest upsets in human history.',difficulty:1,atmosphere:'rgba(20,8,0,0.5)',ambient:'battle',
scenes:[
{name:'The Valley of Fear',icon:'⚔️',lines:[{t:'story',text:'The valley is silent.'},{t:'story',text:'On one hill — the army of Israel. Forty thousand soldiers.'},{t:'story',text:'On the other hill — the Philistines. Fierce. Battle-hardened. Ready.'},{t:'story',text:'For forty days, both armies face each other. Nobody moves.'},{t:'dramatic',text:'Because every single morning — a giant walks out.'},{t:'story',text:'His name is Goliath. Nine feet tall. Bronze armour from head to toe.'},{t:'dramatic',text:'"Send me your best fighter!" he roars. "Winner takes everything!"'},{t:'whisper',text:'And every soldier in Israel\'s army... turns around and runs.'}]},
{name:'The Boy Arrives',icon:'🐑',scripture:{text:'"The Lord does not look at the outward appearance, but the Lord looks at the heart."',ref:'1 Samuel 16:7'},lines:[{t:'story',text:'Then one day — a teenage shepherd boy named David arrives.'},{t:'dramatic',text:'He hears Goliath\'s voice — and something rises inside him.'},{t:'story',text:'"I have killed lions and bears protecting my father\'s sheep."'},{t:'dramatic',text:'"This Philistine will be the same — he has defied the living God!"'}]},
{name:'Five Smooth Stones',icon:'🌊',scripture:{text:'"I come against you in the name of the Lord Almighty."',ref:'1 Samuel 17:45'},lines:[{t:'story',text:'David picks up five smooth stones from a stream.'},{t:'whisper',text:'And walks toward the giant.'},{t:'story',text:'"I come in the name of the Lord Almighty! Today the whole world will know there is a God in Israel!"'},{t:'story',text:'He releases the stone. It strikes Goliath square in the forehead.'},{t:'dramatic',text:'The giant falls. Face down. Dead.'},{t:'whisper',text:'And all of Israel roars.'}]}],
questions:[
{type:'mcq',diff:1,q:'How many days did Goliath challenge Israel?',hint:'The Bible gives the exact number.',opts:['Seven days','Twenty days','Forty days','Fourteen days'],correct:2,explanation:'Exactly forty days — morning and evening — Goliath taunted Israel. David arrived and changed everything.',scripture:'"For forty days the Philistine came forward every morning and evening." — 1 Samuel 17:16'},
{type:'mcq',diff:1,q:'Why did David come to the battlefield?',hint:'He was not sent as a warrior.',opts:['King Saul summoned him','His father sent food for his brothers','He ran from his sheep','God appeared to him in a dream'],correct:1,explanation:'David\'s father Jesse sent him with bread and cheese for his brothers — not to fight.',scripture:'"Jesse said to David, \'Take this food to your brothers.\'" — 1 Samuel 17:17'},
{type:'mcq',diff:2,q:'How tall was Goliath?',hint:'Taller than any modern basketball player.',opts:['Six cubits and a span (~9 feet)','Four cubits (~6 feet)','Seven cubits (~10.5 feet)','Five cubits (~7.5 feet)'],correct:0,explanation:'Goliath was "six cubits and a span" — approximately nine feet tall.',scripture:'"His height was six cubits and a span." — 1 Samuel 17:4'},
{type:'mcq',diff:2,q:'What animals had David already killed?',hint:'He told King Saul about two specific animals.',opts:['Wolves and bears','Lions and bears','Lions and leopards','Bears and hyenas'],correct:1,explanation:'David killed both a lion and a bear while protecting his sheep.',scripture:'"Your servant has killed both the lion and the bear." — 1 Samuel 17:36'},
{type:'mcq',diff:2,q:'How many stones did David take from the stream?',hint:'The Bible gives the exact number.',opts:['One','Three','Five','Ten'],correct:2,explanation:'David chose exactly five smooth stones. He only needed one.',scripture:'"He chose five smooth stones from the stream." — 1 Samuel 17:40'},
{type:'mcq',diff:3,q:'Where exactly did the stone hit Goliath?',hint:'The Bible is very specific about this one spot.',opts:['In his chest','In his throat','In the forehead','In his eye'],correct:2,explanation:'The stone struck Goliath\'s forehead — his only exposed area.',scripture:'"The stone sank into his forehead, and he fell facedown." — 1 Samuel 17:49'},
{type:'fill',diff:3,q:'Complete David\'s declaration: "I come against you in the name of ___"',hint:'Not a weapon — a name. (Using the hint costs 10 speed points)',answer:'the lord almighty',acceptedAnswers:['the lord almighty','the lord of hosts','god','the lord'],explanation:'David came in the NAME of the Lord Almighty — not with human weapons.',scripture:'"I come against you in the name of the Lord Almighty." — 1 Samuel 17:45'},
{type:'mcq',diff:3,q:'What did the Philistine army do when Goliath fell?',hint:'Think about what losing your champion means.',opts:['Surrendered immediately','Fought harder','Turned and ran','Sent a second champion'],correct:2,explanation:'The entire Philistine army fled in panic when their champion fell.',scripture:'"When the Philistines saw their hero was dead, they turned and ran." — 1 Samuel 17:51'}]},
{id:'daniel-lions',icon:'🦁',num:'Episode II',title:'The Man Who Would Not Stop Praying',book:'Daniel 6',desc:'A law was passed to destroy him. The lions were hungry. Daniel knelt anyway.',difficulty:2,atmosphere:'rgba(6,0,12,0.5)',ambient:'daniel',
scenes:[
{name:'The Plot',icon:'🐍',lines:[{t:'story',text:'Daniel is the most respected man in all of Babylon.'},{t:'dramatic',text:'That makes certain people very, very angry.'},{t:'story',text:'They search for something wrong with him. But they find nothing.'},{t:'dramatic',text:'So they attack the only thing they can — his faith.'},{t:'story',text:'"Issue a new law — thirty days, no prayer to any god but you, O King."'},{t:'whisper',text:'The trap is set.'}]},
{name:'The Open Window',icon:'🙏',scripture:{text:'"Three times a day he got down on his knees and prayed, giving thanks to his God, just as he had done before."',ref:'Daniel 6:10'},lines:[{t:'story',text:'Daniel hears about the new law. He knows what it means.'},{t:'dramatic',text:'And then he does something extraordinary.'},{t:'story',text:'He goes home, opens the window facing Jerusalem.'},{t:'dramatic',text:'And he kneels. Three times a day. Exactly as always.'},{t:'whisper',text:'He does not even close the window.'}]},
{name:'The Den',icon:'🦁',scripture:{text:'"My God sent his angel, and he shut the mouths of the lions."',ref:'Daniel 6:22'},lines:[{t:'dramatic',text:'Daniel is thrown into the lions\' den.'},{t:'story',text:'All night the king cannot eat, cannot sleep.'},{t:'dramatic',text:'At dawn he runs to the den. "Daniel! Has your God saved you?"'},{t:'dramatic',text:'"O King, live forever! My God shut the mouths of the lions."'},{t:'whisper',text:'Not a scratch. Because he had trusted in his God.'}]}],
questions:[
{type:'mcq',diff:1,q:'Why were the officials jealous of Daniel?',opts:['He had more wealth','The king planned to make him ruler over the whole empire','Daniel insulted them','He refused to cooperate'],correct:1,explanation:'Darius planned to set Daniel over the entire kingdom.',scripture:'"The king planned to set him over the whole kingdom." — Daniel 6:3'},
{type:'mcq',diff:1,q:'How many days did the law ban prayer to other gods?',opts:['Seven','Fourteen','Twenty-one','Thirty'],correct:3,explanation:'The decree lasted thirty days.',scripture:'"Anyone who prays to any god during the next thirty days." — Daniel 6:7'},
{type:'mcq',diff:2,q:'Which direction did Daniel\'s window face?',hint:'He always pointed himself toward the holy city.',opts:['Toward Babylon','Toward Persia','Toward Jerusalem','Toward Egypt'],correct:2,explanation:'Daniel\'s window faced Jerusalem — always orienting himself toward God.',scripture:'"His windows were open toward Jerusalem." — Daniel 6:10'},
{type:'mcq',diff:2,q:'How many times each day did Daniel pray?',opts:['Once','Twice','Three times','Five times'],correct:2,explanation:'Daniel prayed three times a day — a habit no law could break.',scripture:'"Three times a day he got down on his knees and prayed." — Daniel 6:10'},
{type:'mcq',diff:2,q:'What did Darius do the night Daniel was in the den?',hint:'He was deeply troubled by what he had allowed.',opts:['Celebrated','Slept soundly','Fasted and could not sleep','Wrote a new law'],correct:2,explanation:'Darius fasted all night, unable to sleep — tormented by what he had allowed.',scripture:'"He fasted and could not sleep." — Daniel 6:18'},
{type:'mcq',diff:3,q:'How did Daniel explain why the lions did not hurt him?',opts:['Lions were not hungry','God sent an angel to shut the lions\' mouths','He prayed all night','Lions recognised his righteousness'],correct:1,explanation:'God sent His angel to shut the lions\' mouths.',scripture:'"My God sent his angel, and he shut the mouths of the lions." — Daniel 6:22'},
{type:'fill',diff:3,q:'Daniel 6:23 — "no wound was found on him, because he had ___ in his God."',hint:'One powerful word explains everything. (Using the hint costs 10 speed points)',answer:'trusted',acceptedAnswers:['trusted','trust','believed','faith'],explanation:'Daniel was unharmed because he TRUSTED God.',scripture:'"No wound was found on him, because he had trusted in his God." — Daniel 6:23'},
{type:'mcq',diff:3,q:'What did Darius do AFTER Daniel was rescued?',opts:['Made Daniel king','Issued a decree all must fear Daniel\'s God','Destroyed the den','Apologised privately'],correct:1,explanation:'Darius issued a royal decree across his empire to fear the God of Daniel.',scripture:'"All people must fear and reverence the God of Daniel." — Daniel 6:26'}]},
{id:'moses-exodus',icon:'🔥',num:'Episode III',title:'The Voice in the Burning Bush',book:'Exodus 3–4',desc:'A fugitive shepherd hears his name called from a bush that refuses to burn up.',difficulty:2,atmosphere:'rgba(16,8,0,0.5)',ambient:'moses',
scenes:[
{name:'The Forgotten Man',icon:'🐚',lines:[{t:'story',text:'Millions of Israelites work as slaves in Egypt.'},{t:'story',text:'They cry out to God. And God hears every cry.'},{t:'dramatic',text:'Meanwhile — a man named Moses is quietly watching sheep.'},{t:'whisper',text:'He used to be royalty. That was forty years ago.'}]},
{name:'The Fire That Would Not Die',icon:'🔥',scripture:{text:'"Moses saw that though the bush was on fire it did not burn up."',ref:'Exodus 3:2'},lines:[{t:'story',text:'A bush is on fire — but it is not burned up.'},{t:'dramatic',text:'And God calls his name. "Moses! Moses!"'},{t:'story',text:'"Take off your sandals — this ground is holy."'},{t:'dramatic',text:'Moses hides his face. He is afraid to look at God.'}]},
{name:'The Impossible Call',icon:'⚡',scripture:{text:'"I AM WHO I AM. Tell them — I AM has sent you."',ref:'Exodus 3:14'},lines:[{t:'dramatic',text:'"I am sending YOU to Pharaoh — to bring my people out of Egypt."'},{t:'story',text:'"Who am I?" Moses asks. "I cannot speak well."'},{t:'story',text:'"Your brother Aaron will speak for you. I will teach you both."'},{t:'dramatic',text:'"Now go."'},{t:'whisper',text:'God had chosen Moses long before Moses knew his own name.'}]}],
questions:[
{type:'mcq',diff:1,q:'Where was Moses when he saw the burning bush?',opts:['In Egypt near the Nile','Near a mountain called Horeb','In a city','By the Red Sea'],correct:1,explanation:'Moses was at Horeb — the mountain of God.',scripture:'"He led the flock to Horeb, the mountain of God." — Exodus 3:1'},
{type:'mcq',diff:1,q:'What was unusual about the burning bush?',opts:['It made a loud sound','It glowed many colours','It burned but was not consumed','It moved across the ground'],correct:2,explanation:'The bush burned without being consumed — that\'s what stopped Moses.',scripture:'"Though the bush was on fire it did not burn up." — Exodus 3:2'},
{type:'mcq',diff:2,q:'What did God tell Moses to do before coming closer?',hint:'A physical sign of respect for holy ground.',opts:['Bow down','Remove his sandals','Cover his eyes','Bring an offering'],correct:1,explanation:'Remove his sandals — because the ground was holy.',scripture:'"Take off your sandals, for the place where you are standing is holy ground." — Exodus 3:5'},
{type:'mcq',diff:2,q:'How long had Moses been in the wilderness?',hint:'He fled Egypt as a young man and was old when called.',opts:['Twenty years','Thirty years','Forty years','Ten years'],correct:2,explanation:'Moses fled Egypt at 40 and stood before Pharaoh at 80 — forty years in the wilderness.',scripture:'Acts 7:23 and 7:30 show forty years in Egypt then forty in Midian.'},
{type:'mcq',diff:2,q:'What name did God reveal to Moses?',opts:['Lord of Hosts','The Almighty','I AM WHO I AM','God of Heaven'],correct:2,explanation:'"I AM WHO I AM" — YHWH — the eternal, self-existent God.',scripture:'"God said to Moses, \'I AM WHO I AM.\'" — Exodus 3:14'},
{type:'mcq',diff:3,q:'What excuse did Moses give for not wanting to speak?',opts:['Too old','Did not know the way','Not eloquent — slow of speech','No authority'],correct:2,explanation:'Moses was "slow of speech and tongue" — God promised to be with his mouth.',scripture:'"I am slow of speech and tongue." — Exodus 4:10'},
{type:'fill',diff:3,q:'God said: "I have heard their cry on account of their ___."',hint:'The cruel people forcing the Israelites to work. (Using the hint costs 10 speed points)',answer:'taskmasters',acceptedAnswers:['taskmasters','task masters','slave drivers','oppressors'],explanation:'God heard the cry "on account of their taskmasters."',scripture:'"I have heard their cry on account of their taskmasters." — Exodus 3:7 (ESV)'},
{type:'mcq',diff:3,q:'Who would speak to Pharaoh on Moses\'s behalf?',opts:['Joshua','Caleb','Aaron','Miriam'],correct:2,explanation:'Aaron, Moses\'s brother, was appointed as his spokesman.',scripture:'"He will speak to the people for you." — Exodus 4:16'}]}
];

// ── Life restoration question pool ────────────────────────────
const LIFE_QUESTIONS = [
  { type:'mcq', q:'Who was thrown into the lions\' den for praying to God?',
    opts:['Moses','Daniel','Elijah','Jonah'], correct:1,
    explanation:'Daniel continued praying three times a day despite the king\'s decree.',
    scripture:'"My God sent his angel, and he shut the mouths of the lions." — Daniel 6:22' },
  { type:'mcq', q:'How many days was Jonah inside the great fish?',
    opts:['One day','Two days','Three days','Seven days'], correct:2,
    explanation:'Jonah was in the belly of the fish for three days and three nights.',
    scripture:'"Jonah was in the belly of the fish three days and three nights." — Jonah 1:17' },
  { type:'mcq', q:'What did God use to part the Red Sea for Moses?',
    opts:['A great wind alone','Moses stretched out his hand/staff','A pillar of fire','An angel'], correct:1,
    explanation:'God told Moses to stretch out his hand over the sea, and the waters parted.',
    scripture:'"Moses stretched out his hand over the sea." — Exodus 14:21' },
  { type:'mcq', q:'Which king tried to kill baby Jesus?',
    opts:['Caesar Augustus','King Herod','Pontius Pilate','King Solomon'], correct:1,
    explanation:'King Herod ordered all boys under two years in Bethlehem to be killed.',
    scripture:'"Herod gave orders to kill all the boys in Bethlehem." — Matthew 2:16' },
  { type:'mcq', q:'What is the first of the Ten Commandments?',
    opts:['Do not steal','Do not murder','You shall have no other gods before Me','Keep the Sabbath holy'], correct:2,
    explanation:'God commands us to put Him above everything else.',
    scripture:'"You shall have no other gods before me." — Exodus 20:3' },
  { type:'mcq', q:'How many disciples did Jesus choose?',
    opts:['Seven','Ten','Twelve','Fourteen'], correct:2,
    explanation:'Jesus chose twelve disciples to follow and learn from Him.',
    scripture:'"He appointed twelve that they might be with him." — Mark 3:14' },
  { type:'mcq', q:'What did the Good Samaritan do for the wounded man?',
    opts:['Walked past him','Sent a servant','Bandaged his wounds and paid for his care','Prayed from a distance'], correct:2,
    explanation:'The Samaritan showed mercy — caring for him completely at his own expense.',
    scripture:'"He bandaged his wounds... took care of him." — Luke 10:34' },
  { type:'mcq', q:'Which book of the Bible comes first?',
    opts:['Psalms','Exodus','Matthew','Genesis'], correct:3,
    explanation:'Genesis is the first book of the Bible, beginning "In the beginning God created..."',
    scripture:'"In the beginning God created the heavens and the earth." — Genesis 1:1' },
  { type:'mcq', q:'Who built the ark to survive the great flood?',
    opts:['Abraham','Moses','Noah','Elijah'], correct:2,
    explanation:'God instructed Noah to build the ark to save his family and the animals.',
    scripture:'"Noah did everything just as God commanded him." — Genesis 6:22' },
  { type:'mcq', q:'What does the Bible say is the greatest commandment?',
    opts:['Keep the Sabbath','Love your neighbour','Love the Lord your God with all your heart','Do not steal'], correct:2,
    explanation:'Jesus said loving God completely is the greatest commandment.',
    scripture:'"Love the Lord your God with all your heart." — Matthew 22:37' },
  { type:'mcq', q:'Who was swallowed by a large fish in the Bible?',
    opts:['Elijah','Moses','Jonah','Daniel'], correct:2,
    explanation:'Jonah fled from God\'s call and was swallowed by a great fish.',
    scripture:'"The Lord provided a huge fish to swallow Jonah." — Jonah 1:17' },
  { type:'mcq', q:'What river was Jesus baptised in?',
    opts:['Nile','Euphrates','Jordan','Galilee'], correct:2,
    explanation:'John the Baptist baptised Jesus in the River Jordan.',
    scripture:'"Jesus was baptised by John in the Jordan." — Mark 1:9' },
];

// ── Stone economy config ──────────────────────────────────────
const STONE_CONFIG = {
  1:     { start: 7, max: 12 },
  2:     { start: 5, max: 10 },
  3:     { start: 5, max: 10 },
  '4w1': { start: 6, max: 12 },
  '4w2': { start: 4, max: 10 },
  '4w3': { start: 3, max: 8  },
};

// ── Rank tiers ────────────────────────────────────────────────
const RANK_TIERS = [
  { id:'servant',  icon:'✨', title:'Servant of the Most High', sub:'Perfect mastery — all episodes + all levels',
    check: (s) => s.allEpisodesDone && s.level4beaten && s.avgAccuracy >= 90 },
  { id:'champion', icon:'👑', title:'Champion of Faith',       sub:'All levels conquered + all episodes complete',
    check: (s) => s.allEpisodesDone && s.level4beaten },
  { id:'prophet',  icon:'📜', title:'Prophet of the Word',     sub:'Deep Bible knowledge — 80%+ accuracy',
    check: (s) => s.avgAccuracy >= 80 && s.level3beaten },
  { id:'slayer',   icon:'🦁', title:'Slayer of Giants',        sub:'Night battle survived + 2+ episodes done',
    check: (s) => s.level3beaten && s.episodesDone >= 2 },
  { id:'warrior',  icon:'⚔️', title:'Warrior of Israel',      sub:'Shield Bearer defeated + 1+ episode done',
    check: (s) => s.level2beaten && s.episodesDone >= 1 },
  { id:'carrier',  icon:'🪨', title:'Stone Carrier',           sub:'Goliath defeated in Level 1',
    check: (s) => s.level1beaten },
];

// ── Quiz rank tiers (verdict screen) ─────────────────────────
const RANKS=[{min:0,name:'Novice',crown:'📖',cls:'novice',sub:'Keep reading — every scripture is a step forward.'},{min:40,name:'Scribe',crown:'✍️',cls:'scribe',sub:'You know the stories well. The Word is taking root.'},{min:70,name:'Prophet',crown:'🌟',cls:'prophet',sub:'Remarkable! The Spirit is teaching you.'},{min:90,name:'Apostle',crown:'👑',cls:'apostle',sub:'Extraordinary! You have hidden His Word in your heart.'}];

// ── Verdict screen verses ─────────────────────────────────────
const VVERSES=[{text:'"I have hidden your word in my heart that I might not sin against you."',ref:'Psalm 119:11'},{text:'"Your word is a lamp to my feet and a light to my path."',ref:'Psalm 119:105'},{text:'"Faith comes from hearing the message, and the message is heard through the word about Christ."',ref:'Romans 10:17'},{text:'"Do not merely listen to the word. Do what it says."',ref:'James 1:22'}];

// ── Timer per difficulty ──────────────────────────────────────
const TDIFF={1:30,2:22,3:18};
