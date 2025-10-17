--
-- PostgreSQL database dump
--

\restrict vunEGGSLlpVlcz0cV3FaGiGx9Mj0vcaz9ACIaBISCcvOMolWYNSdozTkU9KdvHG

-- Dumped from database version 18.0 (Debian 18.0-1.pgdg13+3)
-- Dumped by pg_dump version 18.0 (Ubuntu 18.0-1.pgdg24.04+3)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Route; Type: TABLE; Schema: public; Owner: joel
--

CREATE TABLE public."Route" (
    id text NOT NULL,
    "externalId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    color text NOT NULL
);


ALTER TABLE public."Route" OWNER TO joel;

--
-- Name: Stop; Type: TABLE; Schema: public; Owner: joel
--

CREATE TABLE public."Stop" (
    id text NOT NULL,
    "externalId" text NOT NULL,
    name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL
);


ALTER TABLE public."Stop" OWNER TO joel;

--
-- Name: _RouteToStop; Type: TABLE; Schema: public; Owner: joel
--

CREATE TABLE public."_RouteToStop" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_RouteToStop" OWNER TO joel;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: joel
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO joel;

--
-- Data for Name: Route; Type: TABLE DATA; Schema: public; Owner: joel
--

COPY public."Route" (id, "externalId", name, code, color) FROM stdin;
cmgvb1qsk0054twupysgzqekf	129	INTERIOR	1	#FFFF18
cmgvb1qsu0055twupdkbin00x	130	RONDA - HOSPITALS	2	#FF134A
cmgvb1qt90056twup2y4jvu18	131	EXTERIOR - HOSPITALS	3	#FF5F28
cmgvb1qto0057twupcswna631	132	PARDINYES-MARIOLA	4	#1571FD
cmgvb1qty0058twuputh4yc9g	133	CAPPONT - ARNAU DE VILANOVA	5	#088F1A
cmgvb1qua0059twupgngwvzak	134	MERCAT BORDETA AGRONOMS TANATORI	6	#08508A
cmgvb1quq005atwupio19fzll	135	COSTA MAGRANERS-AV.SANT PERE	7	#099496
cmgvb1qvd005btwup1n8atln8	136	BALÀFIA - CLOT - CENTRE	8	#FF84FF
cmgvb1qvr005ctwupidlub7y5	137	POLIGONS	9	#00080B
cmgvb1qw4005dtwupkoga1ewb	138	GRAN DE LLIVIA-CAPARRELLA	10	#892D00
cmgvb1qwi005etwup1li3vtbi	332	RONDA	20	#0A8FA9
\.


--
-- Data for Name: Stop; Type: TABLE DATA; Schema: public; Owner: joel
--

COPY public."Stop" (id, "externalId", name, latitude, longitude) FROM stdin;
cmgvb1qmo0000twupsq9o73bk	10242	ESTACIÒ D'AUTOBUSOS	41.61090045882	0.62279917430489
cmgvb1qmr0001twupvzv419e0	10211	CATALUNYA	41.611833748809	0.6202890387767
cmgvb1qmt0002twupuqve9dve	10380	UNIVERSITAT	41.61329	0.61989
cmgvb1qmu0003twup1l4gy4bf	10258	HISENDA	41.6164216	0.620783
cmgvb1qmw0004twup078ptjw9	10333	RICARD VIÑES / PRAT DE LA RIBA	41.61917664541	0.61984203558836
cmgvb1qmy0005twup116hbcu9	10236	ENSENYANÇA/PRAT DE LA RIBA	41.620487342823	0.62297635044911
cmgvb1qn10006twupi7ckj3ob	12873	AMBULATORI/GUÀRDIA URBANA	41.621206817941	0.62512969932094
cmgvb1qn40007twupj31xtytb	10177	AUDITORI	41.62066742724	0.62789674228134
cmgvb1qn50008twupdntqmj34	10246	ESTACIÓ RENFE/RAMBLA FERRAN	41.619758982695	0.63169760904543
cmgvb1qn70009twup9sumrl21	10176	AUDIÈNCIA	41.617913000665	0.63006425759621
cmgvb1qn9000atwupap5jpqws	10315	PONT VELL/FRANCESC MACIA	41.616367097168	0.62863837703435
cmgvb1qnb000btwup4gyhwzbb	10327	PONT VELL/PAERIA	41.614757994708	0.62717854232791
cmgvb1qnc000ctwupygynjra5	10213	CAVALLERS	41.612619824156	0.62480368870081
cmgvb1qnd000dtwuppj7m1c1b	13058	ESTACIO D`AUTOBUSOS/AV.MADRID	41.61032204897	0.62172142564305
cmgvb1qne000etwupo4vccjob	10306	AV. MADRID/COS-GAYÓN	41.608689292322	0.61795274440124
cmgvb1qnf000ftwupcgsrq12p	10379	RONDA/UNIO	41.610217692666	0.61594545378044
cmgvb1qng000gtwupcf0oxoro	10318	PLAÇA PAGESOS	41.612279470984	0.61417736982317
cmgvb1qni000htwupxb0wl2la	10222	RONDA/PIUSXII	41.614668127949	0.613405221293
cmgvb1qnj000itwuptr6d9q4k	10353	RONDA/SEGRIA	41.617431626473	0.61383050230893
cmgvb1qnl000jtwupyetlsthj	10286	MERCAT FLEMING	41.619876352792	0.61569757497839
cmgvb1qnm000ktwupvsv1xxwp	10261	HOSPITAL SANTA MARIA 2	41.622844687211	0.61641032068563
cmgvb1qno000ltwupkoq6czi7	10219	ONZE DE SETEMBRE 2	41.624832370046	0.6136869504844
cmgvb1qnr000mtwupe82ula5i	13056	ARNAU DE VILANOVA 2	41.626170937709	0.61087749332872
cmgvb1qns000ntwupy1k9k46p	10171	ARNAU DE VILANOVA	41.625990731885	0.61072199749663
cmgvb1qnt000otwuphsye2lvn	10220	ONZE DE SETEMBRE	41.624633463191	0.61361372236767
cmgvb1qnu000ptwup7zwikq9v	10260	HOSPITAL SANTA MARIA	41.622759123179	0.61616745911789
cmgvb1qnv000qtwupbu4tlhw6	10235	RONDA / ENRIC GRANADOS	41.621765973745	0.61822050475884
cmgvb1qnw000rtwupxw052lrq	10263	RONDA/HUMBERT TORRES	41.623359113849	0.62034638438926
cmgvb1qnx000stwupnminx7vb	10313	RONDA/PLAÇA EUROPA	41.625109793696	0.62255926229159
cmgvb1qny000ttwupaua6c7ay	10310	PL.EUROPA/P.VIANA	41.625021501605	0.62351432261335
cmgvb1qo0000utwupfduukv7c	10308	P.VIANA/PLAÇA DEL TREBALL	41.623624632431	0.62598195293413
cmgvb1qo1000vtwupsn801n7c	13030	P.VIANA/PRAT DE LA RIBA	41.622244512184	0.62840529872994
cmgvb1qo2000wtwup95wras02	10248	ESTACIÓ RENFE/P.VIANA	41.620683069122	0.63141526726145
cmgvb1qo3000xtwupfknollc7	10198	CAMPS ELISIS 2	41.613694072296	0.63004147568118
cmgvb1qo4000ytwuphgwprvis	10254	DRA. CASTELLS/GARRIGUES	41.611921327756	0.63125576925985
cmgvb1qo5000ztwupi8r7xbu4	10337	CAP CAPPONT	41.610427394545	0.62942974381031
cmgvb1qo60010twuphgdr4h7v	10336	DRA. CASTELLS/ESTUDI GENERAL	41.608437681561	0.62720459338994
cmgvb1qo70011twupbb5848fg	10326	PONT UNIVERSITAT	41.609161647611	0.62474348743443
cmgvb1qo80012twup782de4yq	13055	EST. D`AUTOBUSOS/JOANA RASPALL	41.610077520555	0.62218703466192
cmgvb1qo90013twupkwfyz8ct	10472	PONT UNIVERSITAT 2	41.609171262472	0.62440464990777
cmgvb1qoa0014twup2fscja8r	13048	DRA CASTELLS/ESTUDI GENERAL 2	41.608210861068	0.62726969738412
cmgvb1qob0015twup1eq2rp17	13072	CAP CAPPONT 2	41.610159036944	0.62965220087285
cmgvb1qoc0016twupx90izzll	13049	DRA. CASTELLS/GARRIGUES 2	41.611771214697	0.63155534016937
cmgvb1qod0017twupmg6x8vsc	10197	CAMPS ELISIS	41.61368518975	0.63031511601367
cmgvb1qoe0018twupez4pqxn7	10339	PONT VELL/AV. SEGRE	41.615303477016	0.62815252438928
cmgvb1qog0019twupyyn5gc15	13057	AUDIÈNCIA 2	41.618482568988	0.63109722638478
cmgvb1qoh001atwupm5pzw0zp	10247	ESTACIÓ RENFE	41.620486878763	0.63216514267674
cmgvb1qoi001btwupdsiu50do	10330	P.VIANA/PRAT DE LA RIBA 2	41.622830413113	0.62787962940682
cmgvb1qok001ctwuphpzxg2gl	10226	P.VIANA/CORTS CATALANES	41.624175786689	0.62542966817044
cmgvb1qol001dtwups2buazmb	10314	RONDA/PLAÇA EUROPA 2	41.625092237348	0.6222751694705
cmgvb1qom001etwuphjrsdak9	10237	RONDA/ROVIRA ROURE	41.622083689894	0.61834083679591
cmgvb1qon001ftwupk92ygpkk	10229	MERCAT FLEMING 2	41.619501688584	0.61500325091355
cmgvb1qoo001gtwup0uu2apsw	10269	RONDA/SEGRIA 2	41.617672415271	0.61365446035474
cmgvb1qop001htwup9kwiwkgj	10300	RONDA/PIUS XII 2	41.613719200577	0.61324820184117
cmgvb1qoq001itwupi589nh7d	10319	PLAÇA PAGESOS 2	41.611716882186	0.61422441073603
cmgvb1qor001jtwup61l5vlh7	10208	RONDA/UNIO 2	41.61003546396	0.61584416246687
cmgvb1qos001ktwupp611gnxv	10266	INSTITUTS	41.607280025426	0.6179129028867
cmgvb1qou001ltwuprf7rxs5j	10311	PASSAREL·LA MARISTES	41.608751877029	0.62046798630558
cmgvb1qov001mtwupxs9t7ygw	10186	BLOCS JUAN CARLOS	41.612583934974	0.60939408502531
cmgvb1qow001ntwup4tka4wre	13177	GERMANS IZQUIERDO / CAP	41.613362051882	0.61209726866603
cmgvb1qox001otwupxkbkmww4	13178	MARIOLA / VENUS	41.612132197448	0.61283001398147
cmgvb1qoz001ptwupset6f2yy	10241	ESCORXADOR	41.611855099301	0.61642583835021
cmgvb1qp0001qtwupyc54s0eq	10169	AMBULATORI	41.621455207801	0.6253975050722
cmgvb1qp1001rtwupufs8qcr7	10348	PRAT DE LA RIBA/SANT RUF	41.622943142024	0.62878653954147
cmgvb1qp2001stwupbufmca3o	11605	COBRIMENT DE VIES 2	41.624416913639	0.63100228918193
cmgvb1qp3001ttwupjibqq6mp	11606	BARRIS NORD	41.626095874067	0.63317258189454
cmgvb1qp4001utwupvm461itl	13052	ESCOLA LA MITJANA	41.626889923431	0.63738166996919
cmgvb1qp5001vtwup2qh4a7b2	13043	RECORRIDO	41.627013047221	0.64017074829803
cmgvb1qp6001wtwups0ncq2jv	10276	PARC LA MITJANA	41.62767283925	0.64173445182293
cmgvb1qp7001xtwuphagxasvq	10181	AVINGUDA PEARSON	41.625391127736	0.64088785812464
cmgvb1qp8001ytwupikh8kchu	13054	ESCOLA PARDINYES	41.624568893754	0.63882281108393
cmgvb1qp9001ztwupl9aywir1	10267	JERONI PUJADES / RAMBLA	41.623940778915	0.637407706369
cmgvb1qpb0020twup4ueh9trs	25044	JARDINS DE LES MAGNOLIES2	41.62954	0.62312
cmgvb1qpc0021twup3t7o5fmv	10796	BARO DE MAIALS/VIC	41.629138327538	0.62630382589594
cmgvb1qpd0022twuprw96q998	10795	BARO DE MAIALS/SABADELL	41.627740020665	0.62837178176006
cmgvb1qpe0023twupunbo1cfy	10794	CAP BALÀFIA-PARDINYES	41.626099352952	0.63055561545066
cmgvb1qpg0024twup45j8jcnd	13102	RAMBLA CORREGIDOR ESCOFET	41.624172184451	0.63590743470445
cmgvb1qph0025twupupwal2b5	10183	JERONI PUJADES/BARO DE MAIALS	41.622455196602	0.63583392130374
cmgvb1qpi0026twupu2y3dkrv	13064	LA LLOTJA	41.619146605543	0.63622192548314
cmgvb1qpj0027twup41bjvh2a	10321	PASSAREL·LA CAMPS ELISIS	41.616853697143	0.63260605737903
cmgvb1qpk0028twuptavtnwna	14402	ALACANT/GARRIGUES	41.612137553826	0.63188552856445
cmgvb1qpk0029twupm79i8m0r	14399	PONT DE SUERT	41.612330069394	0.63581228256226
cmgvb1qpl002atwup584cofve	14400	AGUSTINS/GARRIGUES	41.609987757621	0.63454627990723
cmgvb1qpn002btwupv74hkzhk	14401	BARCELONA/RIU EBRE	41.60780580165	0.63154220581055
cmgvb1qpo002ctwup8njzlks3	10465	ESTUDI GENERAL/JOAN FUSTER	41.607480514789	0.6275303613392
cmgvb1qpp002dtwuptawpbdng	10244	ESTACIÒ D'AUTOBUSOS / PONT UNIVERSITIAT	41.610657288319	0.62281760522546
cmgvb1qpp002etwup6ov63q6g	13042	PLA D`URGELL	41.603037478571	0.64606843487877
cmgvb1qpq002ftwupdcn68gs1	10249	EXTREMADURA	41.600210625025	0.64369284629288
cmgvb1qpr002gtwup7zs3rsbb	18043	MERCAT BORDETA/PL.SANT JORDI	41.6022	0.642313
cmgvb1qps002htwupexrki8ac	10462	MIQUEL BATLLORI/FONTANET	41.602991512702	0.6397900126691
cmgvb1qpt002itwup5tywwju2	10463	MUSEU DE L`AIGUA	41.603982116429	0.6367180500293
cmgvb1qpu002jtwupmhzi1a5q	13035	PARC JOAN ORO	41.604983116584	0.63371761065009
cmgvb1qpv002ktwupof8pi16j	10464	MIQUEL BATLLORI/LL11	41.606202692594	0.62996509067124
cmgvb1qpw002ltwupr03fxxbq	10243	ESTACIÓ D'AUTOBUSOS/PL.ESPANYA	41.610735373338	0.62223870716045
cmgvb1qpx002mtwupocx1x8d5	10346	RICARD VIÑES/SANITAT	41.619507502269	0.61919181966552
cmgvb1qpy002ntwupxcsonzqe	13041	PL.ENRIC GRANADOS/ROVIRA ROURE 2	41.621365851197	0.61827804312816
cmgvb1qpz002otwupi7iavb2j	10466	TANATORI	41.631813770053	0.61057696510375
cmgvb1qq0002ptwuphccu1kjl	13047	VILA MONTCADA	41.628571826964	0.6127120658175
cmgvb1qq0002qtwupulfeo7sc	13040	ENRIC GRANADOS/ROVIRA ROURE	41.621359100529	0.61797571187537
cmgvb1qq1002rtwupt2dgs35x	10334	RICARD VIÑES/BALMES	41.618772107019	0.61933507394838
cmgvb1qq2002stwupoc139x2f	10259	HISENDA 2	41.61677	0.62032
cmgvb1qq2002ttwupck4clz0k	10381	UNIVERSITAT 2	41.613194825898	0.6196148345914
cmgvb1qq3002utwupk8p8qgrj	10312	ESTACIO D`AUTOBUSOS/CATALUNYA	41.610733204504	0.62169875898597
cmgvb1qq4002vtwup06myre9h	10473	ESTUDI GENERAL/JOAN FUSTER 2	41.607389939887	0.62726961521233
cmgvb1qq5002wtwupfpp45w5q	10474	MIQUEL BATLLORI/LL11 2	41.606120212502	0.62989611218182
cmgvb1qq6002xtwup6ru62vo5	13036	PARC JOAN ORO 2	41.604891885985	0.63366094802621
cmgvb1qq7002ytwupao9opkut	10475	MUSEU DE L`AIGUA 2	41.603890887208	0.63666138391734
cmgvb1qq8002ztwup0g6cm62c	10476	MIQUEL BATLLORI/FONTANET 2	41.602891038962	0.63972168089537
cmgvb1qq90030twup9x0h5wos	13066	MERCAT BORDETA/AV. ARTESA	41.602557858866	0.64191766902944
cmgvb1qqa0031twupl51gznw1	10172	AV. ARTESA	41.60438492732	0.6414191306132
cmgvb1qqb0032twup6ylhygh4	10189	PALAUET/BOQUE 2	41.607013596666	0.64469286627457
cmgvb1qqc0033twup7q0cmljc	13061	IES MARIA RUBIES/CENTRE	41.605525940888	0.64699340220575
cmgvb1qqd0034twup23t6djzu	10351	LOCAL SOCIAL SECÀ 2	41.635388431915	0.62940658819819
cmgvb1qqe0035twupwn8624x0	10239	ESCOLA  TERRES DE PONENT	41.637733356321	0.6283884514803
cmgvb1qqf0036twupdxbq3lue	10275	LA LLUM	41.638802626517	0.62786435650876
cmgvb1qqg0037twup4jv5do2n	10298	MARIMUNT/PICABAIX	41.6374596941	0.62691166492687
cmgvb1qqh0038twupluei8zvj	10352	LOCAL SOCIAL SECÀ	41.636433997262	0.62752166668554
cmgvb1qqi0039twupa2tn0bvi	10272	LLIBERTAT/LA CREU	41.633622120085	0.63036883523682
cmgvb1qqi003atwup82v7c3wd	10323	LLIBERTAT/POBLA DE SEGUR	41.631764900877	0.63108716709985
cmgvb1qqj003btwup62wp2fio	10374	TORRE VICENS	41.630879359663	0.62924511806614
cmgvb1qqk003ctwupj00cx7o3	11604	COBRIMENT DE VIES	41.624511951509	0.63080675749173
cmgvb1qql003dtwup2fcxlsqe	11608	PRAT DE LA RIBA/P.VIANA	41.622626934488	0.6274940814435
cmgvb1qqm003etwupfj8x3kbi	11609	AMBULATORI/PALLARS	41.621516543902	0.62487914071422
cmgvb1qqm003ftwupnup9y55i	13082	ENSENYANÇA/HUMBERT TORRES	41.62036378188	0.62226893075005
cmgvb1qqn003gtwup6u90j916	10214	CAVALLERS 2	41.612760509636	0.62522455010853
cmgvb1qqo003htwupn4vjqq6h	10328	PONT VELL/BLONDEL	41.614365822128	0.62707384164396
cmgvb1qqp003itwup6ia1i5ha	10230	GARRIGUES/DRA. CASTELLS	41.611890732408	0.6314915641758
cmgvb1qqq003jtwupq5sbh52x	10187	GARRIGUES/BLOCS LA CAIXA 2	41.610100918314	0.63338648867408
cmgvb1qqr003ktwupyzpl7sxk	10202	GARRIGUES/CANAL 2	41.606728725653	0.63757775753235
cmgvb1qqs003ltwuptdu1gwhc	10355	GARRIGUES/SICORIS 2	41.605726908405	0.6396662723641
cmgvb1qqt003mtwupu4c6s6um	13059	AV. ARTESA 2	41.603404950541	0.64150283437437
cmgvb1qqu003ntwuplcycm4gk	13067	MERCAT BORDETA/PL. SANT JORDI 2	41.602319892242	0.64261028486178
cmgvb1qqv003otwupwvvg5wj8	10301	PLA D'URGELL 2	41.602192559477	0.64565485468574
cmgvb1qqw003ptwupv383bads	13076	CENTRE/IES MARIA RÚBIES	41.604757018808	0.64550941242739
cmgvb1qqx003qtwup6jyoffd9	10174	PALAUET/ASTURIES 2	41.609859700791	0.64839590527789
cmgvb1qqy003rtwupc0ntmtbq	10376	PALAUET/ALMERIA 2	41.612011501415	0.65056187814786
cmgvb1qqz003stwups7ep3xff	10216	CEMENTIRI 2	41.612667277944	0.65577591899898
cmgvb1qr0003ttwupfk2z04oh	10324	MECANOVA	41.612544365448	0.65734232335922
cmgvb1qr1003utwupkzng83hb	13060	GARCIA LORCA-N240	41.61070477194	0.66331323737609
cmgvb1qr2003vtwupgve9nnsj	10268	JOAN GAVARRA	41.609870432023	0.66365057271878
cmgvb1qr2003wtwupmjjp7qzp	10283	LOCAL SOCIAL MAGRANERS	41.608976954023	0.66284571889037
cmgvb1qr3003xtwupp42d2wcv	10165	ENSENYANÇA/ALCALDE PORQUERES	41.620895619935	0.62290257421682
cmgvb1qr4003ytwupfppnpocs	13078	CLOT DE LES GRANOTES 2	41.623606694513	0.62316998682539
cmgvb1qr5003ztwup5mm1dfym	13031	ALCALDE PORQUERES/PL. EUROPA 2	41.626571315452	0.62280897097846
cmgvb1qr70040twupqhy36ef7	10285	MERCAT BALAFIA 2	41.628307091191	0.6226497814398
cmgvb1qr80041twuphmh9wjwt	10203	CANTÀBRIA 2	41.631146156897	0.62192054437586
cmgvb1qr90042twupcst08il2	10278	LAUREÀ FIGUEROLA 2	41.63394232006	0.62125348093213
cmgvb1qra0043twupx5muw7fa	10277	LAUREÀ FIGUEROLA	41.633921340574	0.62111019359101
cmgvb1qra0044twupfefje6ig	13038	PASSAREL·LA CAMPS ELISIS 2	41.616959844286	0.63347813396469
cmgvb1qrb0045twupubd6khvn	10387	PALAU DE CONGRESSOS	41.620534858915	0.63798584995915
cmgvb1qrc0046twup1f1qr2x5	10388	CIUTAT DEL TRANSPORT	41.61628269439	0.6469701652918
cmgvb1qrd0047twupsszmqsix	10389	AV. INDÚSTRIA P.203	41.617547505275	0.65174108281099
cmgvb1qre0048twupg94z60d7	10390	AV. INDÚSTRIA P.208	41.620147826338	0.65426322280473
cmgvb1qrf0049twup2l2m8nwl	10391	SEGRE AV.IND./PAU AGUSTÍN	41.621626888173	0.65568592124621
cmgvb1qrg004atwuply7mp3rk	10392	AV. INDÚSTRIA/E.MIES	41.624126357818	0.65820324687729
cmgvb1qrg004btwup7b439tnj	10393	AV. INDÚSTRIA P.503	41.626918760732	0.66084373163176
cmgvb1qrh004ctwupjim1anp1	10394	GROS MERCAT	41.628715578409	0.66212176224747
cmgvb1qri004dtwup2zatsetl	10395	J.SEGURA I FARRÉ P.714	41.628628968746	0.6642910703833
cmgvb1qrj004etwupy6jbchkl	10396	J.SEGURA I FARRÉ P.708	41.625184721999	0.66410335887658
cmgvb1qrk004ftwupcmcg4chb	10397	J.SEGURA I FARRÉ P.702	41.621743685306	0.66495977857178
cmgvb1qrl004gtwuplcy3eobb	12899	ALCARRÀS	41.614539078593	0.66853216095706
cmgvb1qrn004htwup2eiy7870	12900	ELS FRARES SUD	41.611960983631	0.67152926239075
cmgvb1qrp004itwupk6y5d86s	12901	NEOPARC	41.614697512811	0.65993345092191
cmgvb1qrr004jtwuppnjx5pj7	12902	CTRA. TARRAGONA	41.613423356681	0.65663120537031
cmgvb1qrs004ktwupj46uw3ti	12903	CEMENTIRI	41.611231	0.65523
cmgvb1qru004ltwup38sfa357	10377	PALAUET/ALMERIA	41.612054538154	0.65046430852505
cmgvb1qrw004mtwupuzcucvbz	10175	PALAUET/ASTURIES	41.609229302097	0.64731888879419
cmgvb1qrx004ntwuppoza4ily	13034	PALAUET/BOQUE	41.607281408283	0.64475758343354
cmgvb1qry004otwuph9sdxeid	10292	PALAUET/GARRIGUES	41.605750657655	0.6412613681794
cmgvb1qrz004ptwupapnwqezg	10354	GARRIGUES/SICORIS	41.605975203137	0.63947722169239
cmgvb1qs0004qtwupdr91tauq	10188	GARRIGUES/BLOCS LA CAIXA	41.610237640965	0.63346549265599
cmgvb1qs2004rtwup762vkeef	10231	GARRIGUES/ALACANT	41.611941451066	0.63179507106836
cmgvb1qs3004stwupohz9y03v	10223	COMPLEX CAPARRELLA	41.598919187265	0.58136329741797
cmgvb1qs4004ttwupio5d0s3c	13073	CAPARRELLA 2	41.598086966619	0.58664853405009
cmgvb1qs5004utwupnxskx8qj	18045	CREU DEL BATLLE	41.5994	0.598
cmgvb1qs6004vtwupi0xblnp5	11610	CAMI DE RUFEA	41.605332634861	0.61446944450277
cmgvb1qs7004wtwupz8jwolje	11611	TON SIRERA	41.606677233311	0.61763584985347
cmgvb1qs8004xtwup9944c5gw	11697	SANT RUF/ROSA PARKS	41.623909117981	0.62778005644557
cmgvb1qs9004ytwupwosmxv33	13071	CAP BALÀFIA-PARDINYES/ROSA PARKS	41.626131715938	0.63030329846755
cmgvb1qsb004ztwup8oivwd2j	13051	ROSA PARKS/AMB. ESPENS 2	41.627799310942	0.63168265583871
cmgvb1qsc0050twupzcnsxtfu	13080	CTRA. ALBESA 2	41.641736384075	0.63621622473136
cmgvb1qsd0051twupev8uof7f	10815	DEL VERDEROL	41.646765877351	0.63654804165491
cmgvb1qse0052twupxpidws4c	10816	C.E.I.P. LLÍVIA	41.650252058083	0.64111546479613
cmgvb1qsf0053twup4g0c4ky7	10817	ANTONI VILAPLANA	41.649948281147	0.64204097079073
\.


--
-- Data for Name: _RouteToStop; Type: TABLE DATA; Schema: public; Owner: joel
--

COPY public."_RouteToStop" ("A", "B") FROM stdin;
cmgvb1qsk0054twupysgzqekf	cmgvb1qn70009twup9sumrl21
cmgvb1qsk0054twupysgzqekf	cmgvb1qmr0001twupvzv419e0
cmgvb1qsk0054twupysgzqekf	cmgvb1qn10006twupi7ckj3ob
cmgvb1qsk0054twupysgzqekf	cmgvb1qnc000ctwupygynjra5
cmgvb1qsk0054twupysgzqekf	cmgvb1qnb000btwup4gyhwzbb
cmgvb1qsk0054twupysgzqekf	cmgvb1qmt0002twupuqve9dve
cmgvb1qsk0054twupysgzqekf	cmgvb1qmo0000twupsq9o73bk
cmgvb1qsk0054twupysgzqekf	cmgvb1qmw0004twup078ptjw9
cmgvb1qsk0054twupysgzqekf	cmgvb1qn50008twupdntqmj34
cmgvb1qsk0054twupysgzqekf	cmgvb1qn40007twupj31xtytb
cmgvb1qsk0054twupysgzqekf	cmgvb1qmu0003twup1l4gy4bf
cmgvb1qsk0054twupysgzqekf	cmgvb1qmy0005twup116hbcu9
cmgvb1qsk0054twupysgzqekf	cmgvb1qn9000atwupap5jpqws
cmgvb1qsu0055twupdkbin00x	cmgvb1qnt000otwuphsye2lvn
cmgvb1qsu0055twupdkbin00x	cmgvb1qo1000vtwupsn801n7c
cmgvb1qsu0055twupdkbin00x	cmgvb1qni000htwupxb0wl2la
cmgvb1qsu0055twupdkbin00x	cmgvb1qnx000stwupnminx7vb
cmgvb1qsu0055twupdkbin00x	cmgvb1qo5000ztwupi8r7xbu4
cmgvb1qsu0055twupdkbin00x	cmgvb1qo3000xtwupfknollc7
cmgvb1qsu0055twupdkbin00x	cmgvb1qo70011twupbb5848fg
cmgvb1qsu0055twupdkbin00x	cmgvb1qnu000ptwup7zwikq9v
cmgvb1qsu0055twupdkbin00x	cmgvb1qnv000qtwupbu4tlhw6
cmgvb1qsu0055twupdkbin00x	cmgvb1qnf000ftwupcgsrq12p
cmgvb1qsu0055twupdkbin00x	cmgvb1qnr000mtwupe82ula5i
cmgvb1qsu0055twupdkbin00x	cmgvb1qo4000ytwuphgwprvis
cmgvb1qsu0055twupdkbin00x	cmgvb1qns000ntwupy1k9k46p
cmgvb1qsu0055twupdkbin00x	cmgvb1qnl000jtwupyetlsthj
cmgvb1qsu0055twupdkbin00x	cmgvb1qne000etwupo4vccjob
cmgvb1qsu0055twupdkbin00x	cmgvb1qo2000wtwup95wras02
cmgvb1qsu0055twupdkbin00x	cmgvb1qo0000utwupfduukv7c
cmgvb1qsu0055twupdkbin00x	cmgvb1qno000ltwupkoq6czi7
cmgvb1qsu0055twupdkbin00x	cmgvb1qn9000atwupap5jpqws
cmgvb1qsu0055twupdkbin00x	cmgvb1qnj000itwuptr6d9q4k
cmgvb1qsu0055twupdkbin00x	cmgvb1qnd000dtwuppj7m1c1b
cmgvb1qsu0055twupdkbin00x	cmgvb1qng000gtwupcf0oxoro
cmgvb1qsu0055twupdkbin00x	cmgvb1qny000ttwupaua6c7ay
cmgvb1qsu0055twupdkbin00x	cmgvb1qn70009twup9sumrl21
cmgvb1qsu0055twupdkbin00x	cmgvb1qnw000rtwupxw052lrq
cmgvb1qsu0055twupdkbin00x	cmgvb1qo60010twuphgdr4h7v
cmgvb1qsu0055twupdkbin00x	cmgvb1qnm000ktwupvsv1xxwp
cmgvb1qt90056twup2y4jvu18	cmgvb1qnt000otwuphsye2lvn
cmgvb1qt90056twup2y4jvu18	cmgvb1qou001ltwuprf7rxs5j
cmgvb1qt90056twup2y4jvu18	cmgvb1qop001htwup9kwiwkgj
cmgvb1qt90056twup2y4jvu18	cmgvb1qos001ktwupp611gnxv
cmgvb1qt90056twup2y4jvu18	cmgvb1qob0015twup1eq2rp17
cmgvb1qt90056twup2y4jvu18	cmgvb1qoe0018twupez4pqxn7
cmgvb1qt90056twup2y4jvu18	cmgvb1qom001etwuphjrsdak9
cmgvb1qt90056twup2y4jvu18	cmgvb1qoi001btwupdsiu50do
cmgvb1qt90056twup2y4jvu18	cmgvb1qol001dtwups2buazmb
cmgvb1qt90056twup2y4jvu18	cmgvb1qnu000ptwup7zwikq9v
cmgvb1qt90056twup2y4jvu18	cmgvb1qod0017twupmg6x8vsc
cmgvb1qt90056twup2y4jvu18	cmgvb1qnr000mtwupe82ula5i
cmgvb1qt90056twup2y4jvu18	cmgvb1qns000ntwupy1k9k46p
cmgvb1qt90056twup2y4jvu18	cmgvb1qoc0016twupx90izzll
cmgvb1qt90056twup2y4jvu18	cmgvb1qoh001atwupm5pzw0zp
cmgvb1qt90056twup2y4jvu18	cmgvb1qoo001gtwup0uu2apsw
cmgvb1qt90056twup2y4jvu18	cmgvb1qno000ltwupkoq6czi7
cmgvb1qt90056twup2y4jvu18	cmgvb1qor001jtwup61l5vlh7
cmgvb1qt90056twup2y4jvu18	cmgvb1qoa0014twup2fscja8r
cmgvb1qt90056twup2y4jvu18	cmgvb1qo90013twupkwfyz8ct
cmgvb1qt90056twup2y4jvu18	cmgvb1qoq001itwupi589nh7d
cmgvb1qt90056twup2y4jvu18	cmgvb1qok001ctwuphpzxg2gl
cmgvb1qt90056twup2y4jvu18	cmgvb1qnm000ktwupvsv1xxwp
cmgvb1qt90056twup2y4jvu18	cmgvb1qon001ftwupk92ygpkk
cmgvb1qt90056twup2y4jvu18	cmgvb1qog0019twupyyn5gc15
cmgvb1qt90056twup2y4jvu18	cmgvb1qo80012twup782de4yq
cmgvb1qto0057twupcswna631	cmgvb1qov001mtwupxs9t7ygw
cmgvb1qto0057twupcswna631	cmgvb1qox001otwupxkbkmww4
cmgvb1qto0057twupcswna631	cmgvb1qp4001utwupvm461itl
cmgvb1qto0057twupcswna631	cmgvb1qoz001ptwupset6f2yy
cmgvb1qto0057twupcswna631	cmgvb1qp6001wtwups0ncq2jv
cmgvb1qto0057twupcswna631	cmgvb1qp0001qtwupyc54s0eq
cmgvb1qto0057twupcswna631	cmgvb1qp3001ttwupjibqq6mp
cmgvb1qto0057twupcswna631	cmgvb1qp9001ztwupl9aywir1
cmgvb1qto0057twupcswna631	cmgvb1qp2001stwupbufmca3o
cmgvb1qto0057twupcswna631	cmgvb1qmu0003twup1l4gy4bf
cmgvb1qto0057twupcswna631	cmgvb1qmw0004twup078ptjw9
cmgvb1qto0057twupcswna631	cmgvb1qp5001vtwup2qh4a7b2
cmgvb1qto0057twupcswna631	cmgvb1qp1001rtwupufs8qcr7
cmgvb1qto0057twupcswna631	cmgvb1qp7001xtwuphagxasvq
cmgvb1qto0057twupcswna631	cmgvb1qmt0002twupuqve9dve
cmgvb1qto0057twupcswna631	cmgvb1qmy0005twup116hbcu9
cmgvb1qto0057twupcswna631	cmgvb1qow001ntwup4tka4wre
cmgvb1qto0057twupcswna631	cmgvb1qp8001ytwupikh8kchu
cmgvb1qty0058twuputh4yc9g	cmgvb1qpo002ctwup8njzlks3
cmgvb1qty0058twuputh4yc9g	cmgvb1qpi0026twupu2y3dkrv
cmgvb1qty0058twuputh4yc9g	cmgvb1qo3000xtwupfknollc7
cmgvb1qty0058twuputh4yc9g	cmgvb1qo70011twupbb5848fg
cmgvb1qty0058twuputh4yc9g	cmgvb1qpj0027twup41bjvh2a
cmgvb1qty0058twuputh4yc9g	cmgvb1qnr000mtwupe82ula5i
cmgvb1qty0058twuputh4yc9g	cmgvb1qpg0024twup45j8jcnd
cmgvb1qty0058twuputh4yc9g	cmgvb1qpp002dtwuptawpbdng
cmgvb1qty0058twuputh4yc9g	cmgvb1qpk0028twuptavtnwna
cmgvb1qty0058twuputh4yc9g	cmgvb1qph0025twupupwal2b5
cmgvb1qty0058twuputh4yc9g	cmgvb1qpl002atwup584cofve
cmgvb1qty0058twuputh4yc9g	cmgvb1qpc0021twup3t7o5fmv
cmgvb1qty0058twuputh4yc9g	cmgvb1qpk0029twupm79i8m0r
cmgvb1qty0058twuputh4yc9g	cmgvb1qp3001ttwupjibqq6mp
cmgvb1qty0058twuputh4yc9g	cmgvb1qpn002btwupv74hkzhk
cmgvb1qty0058twuputh4yc9g	cmgvb1qn9000atwupap5jpqws
cmgvb1qty0058twuputh4yc9g	cmgvb1qpe0023twupunbo1cfy
cmgvb1qty0058twuputh4yc9g	cmgvb1qpb0020twup4ueh9trs
cmgvb1qty0058twuputh4yc9g	cmgvb1qpd0022twuprw96q998
cmgvb1qua0059twupgngwvzak	cmgvb1qpo002ctwup8njzlks3
cmgvb1qua0059twupgngwvzak	cmgvb1qpu002jtwupmhzi1a5q
cmgvb1qua0059twupgngwvzak	cmgvb1qnt000otwuphsye2lvn
cmgvb1qua0059twupgngwvzak	cmgvb1qps002htwupexrki8ac
cmgvb1qua0059twupgngwvzak	cmgvb1qq7002ytwupao9opkut
cmgvb1qua0059twupgngwvzak	cmgvb1qq4002vtwup06myre9h
cmgvb1qua0059twupgngwvzak	cmgvb1qpv002ktwupof8pi16j
cmgvb1qua0059twupgngwvzak	cmgvb1qpq002ftwupdcn68gs1
cmgvb1qua0059twupgngwvzak	cmgvb1qo70011twupbb5848fg
cmgvb1qua0059twupgngwvzak	cmgvb1qq0002ptwuphccu1kjl
cmgvb1qua0059twupgngwvzak	cmgvb1qnu000ptwup7zwikq9v
cmgvb1qua0059twupgngwvzak	cmgvb1qq2002stwupoc139x2f
cmgvb1qua0059twupgngwvzak	cmgvb1qq2002ttwupck4clz0k
cmgvb1qua0059twupgngwvzak	cmgvb1qq5002wtwupfpp45w5q
cmgvb1qua0059twupgngwvzak	cmgvb1qmr0001twupvzv419e0
cmgvb1qua0059twupgngwvzak	cmgvb1qpy002ntwupxcsonzqe
cmgvb1qua0059twupgngwvzak	cmgvb1qq8002ztwup0g6cm62c
cmgvb1qua0059twupgngwvzak	cmgvb1qnr000mtwupe82ula5i
cmgvb1qua0059twupgngwvzak	cmgvb1qns000ntwupy1k9k46p
cmgvb1qua0059twupgngwvzak	cmgvb1qq6002xtwup6ru62vo5
cmgvb1qua0059twupgngwvzak	cmgvb1qq0002qtwupulfeo7sc
cmgvb1qua0059twupgngwvzak	cmgvb1qpz002otwupi7iavb2j
cmgvb1qua0059twupgngwvzak	cmgvb1qqa0031twupl51gznw1
cmgvb1qua0059twupgngwvzak	cmgvb1qpt002itwup5tywwju2
cmgvb1qua0059twupgngwvzak	cmgvb1qq3002utwupk8p8qgrj
cmgvb1qua0059twupgngwvzak	cmgvb1qq1002rtwupt2dgs35x
cmgvb1qua0059twupgngwvzak	cmgvb1qpr002gtwup7zs3rsbb
cmgvb1qua0059twupgngwvzak	cmgvb1qq90030twup9x0h5wos
cmgvb1qua0059twupgngwvzak	cmgvb1qno000ltwupkoq6czi7
cmgvb1qua0059twupgngwvzak	cmgvb1qmu0003twup1l4gy4bf
cmgvb1qua0059twupgngwvzak	cmgvb1qmt0002twupuqve9dve
cmgvb1qua0059twupgngwvzak	cmgvb1qpp002etwup6ov63q6g
cmgvb1qua0059twupgngwvzak	cmgvb1qo90013twupkwfyz8ct
cmgvb1qua0059twupgngwvzak	cmgvb1qpw002ltwupr03fxxbq
cmgvb1qua0059twupgngwvzak	cmgvb1qpx002mtwupocx1x8d5
cmgvb1qua0059twupgngwvzak	cmgvb1qqc0033twup7q0cmljc
cmgvb1qua0059twupgngwvzak	cmgvb1qnm000ktwupvsv1xxwp
cmgvb1qua0059twupgngwvzak	cmgvb1qqb0032twup6ylhygh4
cmgvb1quq005atwupio19fzll	cmgvb1qqj003btwup62wp2fio
cmgvb1quq005atwupio19fzll	cmgvb1qqn003gtwup6u90j916
cmgvb1quq005atwupio19fzll	cmgvb1qo3000xtwupfknollc7
cmgvb1quq005atwupio19fzll	cmgvb1qqr003ktwupyzpl7sxk
cmgvb1quq005atwupio19fzll	cmgvb1qq2002stwupoc139x2f
cmgvb1quq005atwupio19fzll	cmgvb1qq2002ttwupck4clz0k
cmgvb1quq005atwupio19fzll	cmgvb1qr1003utwupkzng83hb
cmgvb1quq005atwupio19fzll	cmgvb1qr2003vtwupgve9nnsj
cmgvb1quq005atwupio19fzll	cmgvb1qqu003ntwuplcycm4gk
cmgvb1quq005atwupio19fzll	cmgvb1qqy003rtwupc0ntmtbq
cmgvb1quq005atwupio19fzll	cmgvb1qr2003wtwupmjjp7qzp
cmgvb1quq005atwupio19fzll	cmgvb1qqm003ftwupnup9y55i
cmgvb1quq005atwupio19fzll	cmgvb1qpp002dtwuptawpbdng
cmgvb1quq005atwupio19fzll	cmgvb1qqh0038twupluei8zvj
cmgvb1quq005atwupio19fzll	cmgvb1qr0003ttwupfk2z04oh
cmgvb1quq005atwupio19fzll	cmgvb1qqw003ptwupv383bads
cmgvb1quq005atwupio19fzll	cmgvb1qqf0036twupdxbq3lue
cmgvb1quq005atwupio19fzll	cmgvb1qpc0021twup3t7o5fmv
cmgvb1quq005atwupio19fzll	cmgvb1qqo003htwupn4vjqq6h
cmgvb1quq005atwupio19fzll	cmgvb1qqp003itwup6ia1i5ha
cmgvb1quq005atwupio19fzll	cmgvb1qqi003atwup82v7c3wd
cmgvb1quq005atwupio19fzll	cmgvb1qqz003stwups7ep3xff
cmgvb1quq005atwupio19fzll	cmgvb1qq1002rtwupt2dgs35x
cmgvb1quq005atwupio19fzll	cmgvb1qqi0039twupa2tn0bvi
cmgvb1quq005atwupio19fzll	cmgvb1qqt003mtwupu4c6s6um
cmgvb1quq005atwupio19fzll	cmgvb1qqb0032twup6ylhygh4
cmgvb1quq005atwupio19fzll	cmgvb1qqd0034twup23t6djzu
cmgvb1quq005atwupio19fzll	cmgvb1qqe0035twupwn8624x0
cmgvb1quq005atwupio19fzll	cmgvb1qqx003qtwup6jyoffd9
cmgvb1quq005atwupio19fzll	cmgvb1qqm003etwupfj8x3kbi
cmgvb1quq005atwupio19fzll	cmgvb1qqk003ctwupj00cx7o3
cmgvb1quq005atwupio19fzll	cmgvb1qqq003jtwupq5sbh52x
cmgvb1quq005atwupio19fzll	cmgvb1qqs003ltwuptdu1gwhc
cmgvb1quq005atwupio19fzll	cmgvb1qqg0037twup4jv5do2n
cmgvb1quq005atwupio19fzll	cmgvb1qpe0023twupunbo1cfy
cmgvb1quq005atwupio19fzll	cmgvb1qql003dtwup2fcxlsqe
cmgvb1quq005atwupio19fzll	cmgvb1qqv003otwupwvvg5wj8
cmgvb1quq005atwupio19fzll	cmgvb1qpd0022twuprw96q998
cmgvb1qvd005btwup1n8atln8	cmgvb1qqm003etwupfj8x3kbi
cmgvb1qvd005btwup1n8atln8	cmgvb1qr4003ytwupfppnpocs
cmgvb1qvd005btwup1n8atln8	cmgvb1qqo003htwupn4vjqq6h
cmgvb1qvd005btwup1n8atln8	cmgvb1qr3003xtwupp42d2wcv
cmgvb1qvd005btwup1n8atln8	cmgvb1qoh001atwupm5pzw0zp
cmgvb1qvd005btwup1n8atln8	cmgvb1qr80041twuphmh9wjwt
cmgvb1qvd005btwup1n8atln8	cmgvb1qr5003ztwup5mm1dfym
cmgvb1qvd005btwup1n8atln8	cmgvb1qr90042twupcst08il2
cmgvb1qvd005btwup1n8atln8	cmgvb1qra0043twupx5muw7fa
cmgvb1qvd005btwup1n8atln8	cmgvb1qqn003gtwup6u90j916
cmgvb1qvd005btwup1n8atln8	cmgvb1qql003dtwup2fcxlsqe
cmgvb1qvd005btwup1n8atln8	cmgvb1qr70040twupqhy36ef7
cmgvb1qvd005btwup1n8atln8	cmgvb1qog0019twupyyn5gc15
cmgvb1qvd005btwup1n8atln8	cmgvb1qpp002dtwuptawpbdng
cmgvb1qvr005ctwupidlub7y5	cmgvb1qs2004rtwup762vkeef
cmgvb1qvr005ctwupidlub7y5	cmgvb1qre0048twupg94z60d7
cmgvb1qvr005ctwupidlub7y5	cmgvb1qru004ltwup38sfa357
cmgvb1qvr005ctwupidlub7y5	cmgvb1qoe0018twupez4pqxn7
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrb0045twupubd6khvn
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrc0046twup1f1qr2x5
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrk004ftwupcmcg4chb
cmgvb1qvr005ctwupidlub7y5	cmgvb1qri004dtwup2zatsetl
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrw004mtwupuzcucvbz
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrn004htwup2eiy7870
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrz004ptwupapnwqezg
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrg004atwuply7mp3rk
cmgvb1qvr005ctwupidlub7y5	cmgvb1qra0044twupfefje6ig
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrf0049twup2l2m8nwl
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrx004ntwuppoza4ily
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrr004jtwuppnjx5pj7
cmgvb1qvr005ctwupidlub7y5	cmgvb1qry004otwuph9sdxeid
cmgvb1qvr005ctwupidlub7y5	cmgvb1qs0004qtwupdr91tauq
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrh004ctwupjim1anp1
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrl004gtwuplcy3eobb
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrp004itwupk6y5d86s
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrs004ktwupj46uw3ti
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrd0047twupsszmqsix
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrg004btwup7b439tnj
cmgvb1qvr005ctwupidlub7y5	cmgvb1qrj004etwupy6jbchkl
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qsf0053twup4g0c4ky7
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qou001ltwuprf7rxs5j
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qqo003htwupn4vjqq6h
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qoh001atwupm5pzw0zp
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs8004xtwup9944c5gw
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs9004ytwupwosmxv33
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qsc0050twupzcnsxtfu
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qsb004ztwup8oivwd2j
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qqn003gtwup6u90j916
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs5004utwupnxskx8qj
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qse0052twupxpidws4c
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs6004vtwupi0xblnp5
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs7004wtwupz8jwolje
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qog0019twupyyn5gc15
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs3004stwupohz9y03v
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qpp002dtwuptawpbdng
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qs4004ttwupio5d0s3c
cmgvb1qw4005dtwupkoga1ewb	cmgvb1qsd0051twupev8uof7f
cmgvb1qwi005etwup1li3vtbi	cmgvb1qo1000vtwupsn801n7c
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnc000ctwupygynjra5
cmgvb1qwi005etwup1li3vtbi	cmgvb1qni000htwupxb0wl2la
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnx000stwupnminx7vb
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnv000qtwupbu4tlhw6
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnf000ftwupcgsrq12p
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnl000jtwupyetlsthj
cmgvb1qwi005etwup1li3vtbi	cmgvb1qne000etwupo4vccjob
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnb000btwup4gyhwzbb
cmgvb1qwi005etwup1li3vtbi	cmgvb1qo2000wtwup95wras02
cmgvb1qwi005etwup1li3vtbi	cmgvb1qo0000utwupfduukv7c
cmgvb1qwi005etwup1li3vtbi	cmgvb1qn9000atwupap5jpqws
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnj000itwuptr6d9q4k
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnd000dtwuppj7m1c1b
cmgvb1qwi005etwup1li3vtbi	cmgvb1qng000gtwupcf0oxoro
cmgvb1qwi005etwup1li3vtbi	cmgvb1qny000ttwupaua6c7ay
cmgvb1qwi005etwup1li3vtbi	cmgvb1qn70009twup9sumrl21
cmgvb1qwi005etwup1li3vtbi	cmgvb1qnw000rtwupxw052lrq
cmgvb1qwi005etwup1li3vtbi	cmgvb1qmo0000twupsq9o73bk
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: joel
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2b9407b8-b99a-465f-9e87-25e4c42ae39c	04a199844d62145938c6d7264613d3c201941da2c3f817c9093153a5d7dddce5	2025-10-17 20:16:14.192807+00	20251017201614_init	\N	\N	2025-10-17 20:16:14.180023+00	1
\.


--
-- Name: Route Route_pkey; Type: CONSTRAINT; Schema: public; Owner: joel
--

ALTER TABLE ONLY public."Route"
    ADD CONSTRAINT "Route_pkey" PRIMARY KEY (id);


--
-- Name: Stop Stop_pkey; Type: CONSTRAINT; Schema: public; Owner: joel
--

ALTER TABLE ONLY public."Stop"
    ADD CONSTRAINT "Stop_pkey" PRIMARY KEY (id);


--
-- Name: _RouteToStop _RouteToStop_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: joel
--

ALTER TABLE ONLY public."_RouteToStop"
    ADD CONSTRAINT "_RouteToStop_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: joel
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Route_externalId_key; Type: INDEX; Schema: public; Owner: joel
--

CREATE UNIQUE INDEX "Route_externalId_key" ON public."Route" USING btree ("externalId");


--
-- Name: Stop_externalId_key; Type: INDEX; Schema: public; Owner: joel
--

CREATE UNIQUE INDEX "Stop_externalId_key" ON public."Stop" USING btree ("externalId");


--
-- Name: _RouteToStop_B_index; Type: INDEX; Schema: public; Owner: joel
--

CREATE INDEX "_RouteToStop_B_index" ON public."_RouteToStop" USING btree ("B");


--
-- Name: _RouteToStop _RouteToStop_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joel
--

ALTER TABLE ONLY public."_RouteToStop"
    ADD CONSTRAINT "_RouteToStop_A_fkey" FOREIGN KEY ("A") REFERENCES public."Route"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RouteToStop _RouteToStop_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: joel
--

ALTER TABLE ONLY public."_RouteToStop"
    ADD CONSTRAINT "_RouteToStop_B_fkey" FOREIGN KEY ("B") REFERENCES public."Stop"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vunEGGSLlpVlcz0cV3FaGiGx9Mj0vcaz9ACIaBISCcvOMolWYNSdozTkU9KdvHG

