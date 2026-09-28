-- 0005 : salutation complete (السلام عليكم ورحمة الله وبركاته)

update message_templates
set body = replace(body, 'السلام عليكم', 'السلام عليكم ورحمة الله وبركاته');
