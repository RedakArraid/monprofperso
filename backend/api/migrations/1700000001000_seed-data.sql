-- Up Migration
-- Données de démonstration (issues fidèlement de la maquette).

INSERT INTO subjects (slug, name, icon, accent) VALUES
  ('maths',   'Maths',    'function',  'green'),
  ('physique','Physique', 'atom',      'orange'),
  ('francais','Français', 'book',      'green'),
  ('anglais', 'Anglais',  'translate', 'orange'),
  ('svt',     'SVT',      'leaf',      'orange'),
  ('philo',   'Philo',    'brain',     'green'),
  ('histgeo', 'Hist-Géo', 'globe',     'green'),
  ('plus',    'Plus',     'more',      'orange');

INSERT INTO teachers (initials,name,subjects,rating,reviews_count,location,price_per_hour,experience,students,bac_success,bio,levels,formats,distance_km,accent,special_bepc) VALUES
  ('KN','Koffi N''Guessan','Maths · Physique-Chimie',4.9,128,'Cocody',4000,'8 ans','340+','94%',
   'Professeur certifié, ancien du Lycée Classique d''Abidjan. J''accompagne les élèves de la 3ᵉ à la Terminale avec une méthode claire, des fiches et beaucoup d''exercices types examen. Patient et à l''écoute.',
   ARRAY['Collège','Lycée','Prépa BEPC','Prépa BAC'], ARRAY['home','online'], 2.4,'green',TRUE),
  ('ID','Ibrahim Diallo','Maths · Statistiques',4.7,210,'Yopougon',3000,'5 ans','180+','88%',
   'Spécialiste des maths et statistiques, méthode progressive et bienveillante.',
   ARRAY['Collège','Lycée'], ARRAY['home','online'], 5.1,'orange',FALSE),
  ('AY','Adjoua Yao','Maths · SVT',4.9,88,'Cocody',4000,'6 ans','150+','91%',
   'Passionnée par la réussite de mes élèves, je propose un suivi personnalisé.',
   ARRAY['Collège','Lycée'], ARRAY['home'], 1.8,'green',FALSE),
  ('MT','Mariam Touré','Anglais · Espagnol',5.0,74,'Plateau',4500,'7 ans','120+','96%',
   'Professeure de langues, approche orale et préparation aux examens.',
   ARRAY['Collège','Lycée'], ARRAY['home','online'], 3.2,'orange',FALSE);

INSERT INTO reviews (teacher_id,author_initials,author_name,rating,time_ago,text) VALUES
  (1,'FB','Fatou B.',5,'il y a 2 semaines','Ma fille est passée de 9 à 14 en maths en un trimestre. Très pédagogue et toujours ponctuel. Je recommande vivement !'),
  (1,'KA','Konan A.',5,'il y a 1 mois','Excellent professeur, mon fils a repris confiance.');

INSERT INTO users (full_name, phone, role, initials) VALUES
  ('Aya Koné','+2250758421903','parent','AK'),
  ('Koffi N''Guessan','+2250707001234','teacher','KN');

INSERT INTO courses (user_id,teacher_id,teacher_name,subject,level,day_label,day_num,time,duration,format,location,price,status,badge) VALUES
  (1,1,'Koffi N''Guessan','Maths','3ᵉ','SAM','22','16h00','1h30','home','À domicile, Cocody',6000,'upcoming','Dans 2 jours'),
  (1,4,'Mariam Touré','Anglais','3ᵉ','LUN','24','17h00','1h','online',NULL,4500,'upcoming',NULL),
  (1,1,'Koffi N''Guessan','Maths','3ᵉ','VEN','14','15h00','1h30','home','À domicile, Cocody',6000,'done',NULL);

INSERT INTO notifications (user_id,icon,accent,text,time_ago,unread,section) VALUES
  (1,'calendar','green','Rappel : cours de Maths demain à 16h','il y a 2 h',TRUE,'today'),
  (1,'chat','orange','Koffi vous a envoyé un message','il y a 5 h',TRUE,'today'),
  (1,'wallet','green','Paiement de 6 000 F confirmé','il y a 6 h',FALSE,'today'),
  (1,'seal','green','Koffi a accepté votre demande de cours','lun.',FALSE,'week'),
  (1,'gift','orange','Parrainez un ami, gagnez 2 000 F','dim.',FALSE,'week');

INSERT INTO transactions (user_id,title,subtitle,amount,credit) VALUES
  (1,'Cours Maths · Koffi','22 juin · Orange Money',-6000,FALSE),
  (1,'Crédit de parrainage','20 juin',2000,TRUE),
  (1,'Cours Anglais · Mariam','14 juin · Wave',-4500,FALSE),
  (1,'Remboursement cours annulé','10 juin',3000,TRUE);

INSERT INTO group_courses (tag,tag_accent,price,title,detail,teacher_initials,teacher_name,teacher_accent,enrolled,capacity,places_left) VALUES
  ('PRÉPA BAC','orange',2000,'Maths & Physique-Chimie','Terminale D · 8 semaines · Sam & Dim','KN','Koffi N''Guessan','green',9,12,3),
  ('PRÉPA BEPC','green',1500,'Maths intensif','3ᵉ · 6 semaines · Mer & Sam','ID','Ibrahim Diallo','orange',6,10,4),
  ('VACANCES','green',1500,'Stage de Français','Collège · 2 semaines · Lun → Ven',NULL,NULL,'green',NULL,NULL,NULL);

INSERT INTO subscription_plans (name,detail,price,popular,suffix) VALUES
  ('Découverte','1 cours / sem · 4 / mois',14000,FALSE,NULL),
  ('Régulier','2 cours / sem · 8 / mois',26000,TRUE,NULL),
  ('Intensif','3 cours / sem · 12 / mois',36000,FALSE,'· prépa examen');

INSERT INTO progress_subjects (user_id,subject,grade,fraction,warn) VALUES
  (1,'Mathématiques','14/20',0.70,FALSE),
  (1,'Physique-Chimie','12/20',0.60,FALSE),
  (1,'Français','15/20',0.75,FALSE),
  (1,'Anglais','11/20',0.55,TRUE);

-- Down Migration
DELETE FROM progress_subjects;
DELETE FROM subscription_plans;
DELETE FROM group_courses;
DELETE FROM transactions;
DELETE FROM notifications;
DELETE FROM courses;
DELETE FROM users;
DELETE FROM reviews;
DELETE FROM teachers;
DELETE FROM subjects;
