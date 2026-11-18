(function(){
      'use strict';
      const content={
        en:['Page not found','The requested page could not be found.','Return to the news','Global Citizens home'],
        ar:['الصفحة غير موجودة','تعذر العثور على الصفحة المطلوبة.','العودة إلى الأخبار','الصفحة الرئيسية لـ Global Citizens'],
        es:['Página no encontrada','No se ha encontrado la página solicitada.','Volver a las noticias','Página principal de Global Citizens'],
        zh:['未找到页面','未找到您请求的页面。','返回新闻','Global Citizens 首页'],
        ru:['Страница не найдена','Запрошенная страница не найдена.','Перейти к новостям','Главная страница Global Citizens'],
        fr:['Page introuvable','La page demandée est introuvable.','Retour aux actualités','Accueil de Global Citizens'],
        uk:['Сторінку не знайдено','Запитану сторінку не знайдено.','Перейти до новин','Головна сторінка Global Citizens']
      };
      let lang='en';
      try{const saved=localStorage.getItem('gcimPreferredLanguage');if(content[saved])lang=saved}catch(e){}
      document.documentElement.lang=lang;
      document.documentElement.dir=lang==='ar'?'rtl':'ltr';
      document.title=content[lang][0]+' — Global Citizens';
      document.getElementById('title').textContent=content[lang][0];
      document.getElementById('message').textContent=content[lang][1];
      document.getElementById('home').textContent=content[lang][2];
      document.getElementById('brand').setAttribute('aria-label',content[lang][3]);
      document.getElementById('home').href=(lang==='en'?'index.html':'index-'+lang+'.html');
      document.getElementById('brand').href=(lang==='en'?'index.html':'index-'+lang+'.html');
    })();
