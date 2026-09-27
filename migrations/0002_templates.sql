insert into message_templates (scope, template_key, label, body, sort_order)
values
  (
    'groupe',
    'bilan_seance',
    'Bilan de séance',
    'Bonjour {{parent_name}},
Voici le bilan de la séance du {{session_date}} pour {{student_first_name}} :
- Présence : {{attendance_label}}
- Cours validé : {{validation_label}}
{{comment_line}}
Bonne continuation !
À bientôt,
{{teacher_first_name}}',
    1
  ),
  (
    'groupe',
    'bilan_seance_simple',
    'Bilan de séance (version courte)',
    'Bonjour,
Séance du {{session_date}} - {{student_first_name}} : {{attendance_label}}.
{{comment_line}}
{{teacher_first_name}}',
    2
  ),
  (
    'direct',
    'besoin_materiel',
    'Besoin de matériel',
    'Bonjour {{parent_name}},
Pouvez-vous rappeler à {{student_first_name}} de bien apporter son matériel pour la prochaine séance ?
Merci d''avance,
{{teacher_first_name}}',
    1
  ),
  (
    'direct',
    'absence_prolongee',
    'Absence prolongée',
    'Bonjour {{parent_name}},
Je constate que {{student_first_name}} a manqué plusieurs séances récemment.
Pouvons-nous en discuter ensemble ?
Je reste disponible,
{{teacher_first_name}}',
    2
  ),
  (
    'direct',
    'progres',
    'Progrès',
    'Bonjour {{parent_name}},
Je voulais vous transmettre que {{student_first_name}} progresse bien ces dernières semaines.
{{comment_line}}
Continuez à l''encourager,
{{teacher_first_name}}',
    3
  ),
  (
    'direct',
    'rattrapage',
    'Proposition de rattrapage',
    'Bonjour {{parent_name}},
Suite à l''absence de {{student_first_name}}, je propose une séance de rattrapage.
Donnez-moi vos disponibilités,
{{teacher_first_name}}',
    4
  )
on conflict (template_key) do nothing;
