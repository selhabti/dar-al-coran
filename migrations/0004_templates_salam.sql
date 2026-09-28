-- 0004 : salutation arabe (السلام عليكم) au debut et cloture (في أمان الله) sur tous les modeles

update message_templates set body =
'السلام عليكم {{parent_name}},
Voici le bilan de la séance du {{session_date}} pour {{student_first_name}} :
- Présence : {{attendance_label}}
- Cours validé : {{validation_label}}
{{comment_line}}
Bonne continuation !
À bientôt,
{{teacher_first_name}}
في أمان الله'
where template_key = 'bilan_seance';

update message_templates set body =
'السلام عليكم,
Séance du {{session_date}} - {{student_first_name}} : {{attendance_label}}.
{{comment_line}}
{{teacher_first_name}}
في أمان الله'
where template_key = 'bilan_seance_simple';

update message_templates set body =
'السلام عليكم {{parent_name}},
Pouvez-vous rappeler à {{student_first_name}} de bien apporter son matériel pour la prochaine séance ?
Merci d''avance,
{{teacher_first_name}}
في أمان الله'
where template_key = 'besoin_materiel';

update message_templates set body =
'السلام عليكم {{parent_name}},
Je constate que {{student_first_name}} a manqué plusieurs séances récemment.
Pouvons-nous en discuter ensemble ?
Je reste disponible,
{{teacher_first_name}}
في أمان الله'
where template_key = 'absence_prolongee';

update message_templates set body =
'السلام عليكم {{parent_name}},
Je voulais vous transmettre que {{student_first_name}} progresse bien ces dernières semaines.
{{comment_line}}
Continuez à l''encourager,
{{teacher_first_name}}
في أمان الله'
where template_key = 'progres';

update message_templates set body =
'السلام عليكم {{parent_name}},
Suite à l''absence de {{student_first_name}}, je propose une séance de rattrapage.
Donnez-moi vos disponibilités,
{{teacher_first_name}}
في أمان الله'
where template_key = 'rattrapage';
