-- Corrections de réponses ambiguës existantes
update public.content_items set answer = 'Bernard Hinault' where text = 'Quel cycliste français a gagné 5 Tours de France ?';
update public.content_items set answer = 'Le Super Saiyan' where text = 'Quel est le nom de la transformation ultime au-delà du Super Saiyan classique révélée contre Freezer ?';
update public.content_items set answer = 'All For One (avant qu''il ne le vole)' where text = 'Qui est le premier détenteur connu de One For All ?';
update public.content_items set answer = 'Le Gouvernement Mondial (après la destruction d''Ohara)' where text = 'Quel est le nom complet de l''organisation secrète que Robin a fuie ?';
update public.content_items set answer = 'Fushiguro Megumi (son camarade, pas un ami mort)' where text = 'Quel est le nom du meilleur ami de Yuji qui meurt au début de la série ?';

-- Promotion de 2 questions Fairy Tail au niveau impossible (elles existent déjà en base)
update public.content_items set level = 'impossible' where text = 'Dans Fairy Tail, quel personnage utilise un pistolet magique comme arme principale ?';
update public.content_items set level = 'impossible' where text = 'Dans Fairy Tail, comment s''appelle l''armure qu''Erza invoque et qui n''a pas été portée depuis 10 ans ?';

-- Nouvelles questions de niveau impossible (28 nouvelles, les 2 Fairy Tail sont déjà en base)
insert into public.content_items (content_type, category, subcategory, mode_scope, type, level, text, answer, variants, explanation, manga_series, temps_suggere) values
('question', 'general', 'histoire', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom du dernier empereur byzantin, mort lors de la chute de Constantinople en 1453 ?', 'Constantin XI Paléologue', NULL, NULL, NULL, 30),
('question', 'general', 'histoire', 'tous', 'reponse_libre', 'impossible', 'En quelle année exacte a été signé le traité de Tordesillas partageant le Nouveau Monde entre l''Espagne et le Portugal ?', '1494', NULL, NULL, NULL, 30),
('question', 'general', 'geographie', 'tous', 'reponse_libre', 'impossible', 'Quelle est la capitale administrative des Pays-Bas (différente de la capitale constitutionnelle) ?', 'La Haye', NULL, NULL, NULL, 30),
('question', 'general', 'geographie', 'tous', 'reponse_libre', 'impossible', 'Quel est le point culminant de l''Afrique ?', 'Le Kilimandjaro', NULL, NULL, NULL, 30),
('question', 'general', 'sciences', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom du physicien qui a formulé le principe d''incertitude en mécanique quantique ?', 'Werner Heisenberg', NULL, NULL, NULL, 30),
('question', 'general', 'sciences', 'tous', 'reponse_libre', 'impossible', 'Quelle est la demi-vie du carbone 14, utilisée pour la datation ?', 'Environ 5 730 ans', NULL, NULL, NULL, 30),
('question', 'general', 'arts', 'tous', 'reponse_libre', 'impossible', 'Quel peintre flamand a réalisé le triptyque ''Le Jardin des délices'' ?', 'Jérôme Bosch', NULL, NULL, NULL, 30),
('question', 'general', 'litterature', 'tous', 'reponse_libre', 'impossible', 'Quel auteur japonais a écrit ''La Ballade de Narayama'' ?', 'Shichirō Fukazawa', NULL, NULL, NULL, 30),
('question', 'general', 'musique', 'tous', 'reponse_libre', 'impossible', 'Quelle symphonie de Beethoven est restée inachevée à sa mort ?', 'La 10e symphonie', NULL, NULL, NULL, 30),
('question', 'general', 'sport', 'tous', 'reponse_libre', 'impossible', 'Quel joueur d''échecs a été champion du monde le plus jeune de l''histoire ?', 'Garry Kasparov (à 22 ans, en 1985)', NULL, NULL, NULL, 30),
('question', 'general', 'insolite', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom du seul mammifère capable de vol soutenu ?', 'La chauve-souris', NULL, NULL, NULL, 30),
('question', 'general', 'histoire', 'tous', 'reponse_libre', 'impossible', 'Quel pharaon égyptien a régné le plus longtemps (environ 66 ans) ?', 'Ramsès II', NULL, NULL, NULL, 30),
('question', 'general', 'geographie', 'tous', 'reponse_libre', 'impossible', 'Quel est le seul pays au monde à avoir un drapeau non rectangulaire ?', 'Le Népal', NULL, NULL, NULL, 30),
('question', 'general', 'sciences', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom de l''unité de mesure de la radioactivité dans le système international ?', 'Le Becquerel', NULL, NULL, NULL, 30),
('question', 'general', 'cinema', 'tous', 'reponse_libre', 'impossible', 'Quel film a été le premier long-métrage d''animation de l''histoire du cinéma (1917, aujourd''hui perdu) ?', 'El Apóstol (Argentine)', NULL, NULL, NULL, 30),
('question', 'general', 'litterature', 'tous', 'reponse_libre', 'impossible', 'Quel est le vrai nom de l''auteur George Orwell ?', 'Eric Arthur Blair', NULL, NULL, NULL, 30),
('question', 'general', 'musique', 'tous', 'reponse_libre', 'impossible', 'Dans quelle tonalité est écrite la 5e symphonie de Beethoven ?', 'Do mineur', NULL, NULL, NULL, 30),
('question', 'general', 'histoire', 'tous', 'reponse_libre', 'impossible', 'Quel était le nom de code de l''opération de débarquement allié en Normandie en 1944 ?', 'Overlord', NULL, NULL, NULL, 30),
('question', 'general', 'sciences', 'tous', 'reponse_libre', 'impossible', 'Quel chimiste français a formulé la loi de conservation de la masse ?', 'Antoine Lavoisier', NULL, NULL, NULL, 30),
('question', 'general', 'geographie', 'tous', 'reponse_libre', 'impossible', 'Quelle est la fosse océanique la plus profonde du monde ?', 'La fosse des Mariannes', NULL, NULL, NULL, 30),
('question', 'manga', 'one_piece', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom du village natal de Nico Robin, entièrement rayé de la carte ?', 'Ohara', NULL, NULL, 'One Piece', 30),
('question', 'manga', 'naruto', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom complet de la technique interdite qui invoque le dieu de la mort dans Naruto ?', 'Shiki Fūjin', NULL, NULL, 'Naruto', 30),
('question', 'manga', 'attaque_titans', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom du premier roi muré, fondateur de la lignée royale d''Eldia ?', 'Ymir Fritz', NULL, NULL, 'L''Attaque des Titans', 30),
('question', 'manga', 'hunter_x_hunter', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom de la catégorie de Nen que possède Gon (renforcement) ?', 'Kyōka (renforcement)', NULL, NULL, 'Hunter x Hunter', 30),
('question', 'manga', 'bleach', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom du roi spirituel gouvernant la Soul Society dans Bleach ?', 'Le Roi des Âmes (Soul King)', NULL, NULL, 'Bleach', 30),
('question', 'manga', 'jujutsu_kaisen', 'tous', 'reponse_libre', 'impossible', 'Quel est le nom complet de la technique de Sukuna qui divise l''espace ?', 'Domaine Malléable : Cuisine Mahoraga / Dismantle-Cleave selon les techniques', NULL, NULL, 'Jujutsu Kaisen', 30),
('question', 'general', 'philosophie', 'tous', 'reponse_libre', 'impossible', 'Quel philosophe est l''auteur du concept de ''volonté de puissance'' ?', 'Friedrich Nietzsche', NULL, NULL, NULL, 30),
('question', 'general', 'philosophie', 'tous', 'reponse_libre', 'impossible', 'Dans quel ouvrage Emmanuel Kant développe-t-il l''impératif catégorique ?', 'Fondements de la métaphysique des mœurs', NULL, NULL, NULL, 30);