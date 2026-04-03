<template>
  <div class="max-w-4xl mx-auto p-8 pt-32 text-slate-700 leading-relaxed">
    <h1 class="text-3xl font-black mb-8 text-indigo-600 italic">Aviso Legal</h1>
    
    <section class="space-y-6">
      <div>
        <h2 class="font-bold text-lg text-slate-900">1. Datos Identificativos</h2>
        <p>En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se facilitan los siguientes datos:</p>
        <ul class="list-disc ml-6 mt-2">
          <li><strong>Titular:</strong> Jordi Casanova Solanes</li>
          <li><strong>NIF/CIF:</strong> 20944351E</li>
          <li><strong>Domicilio:</strong> Simat de la Valldigna, España</li>
          <li><strong>Email:</strong> jcasoldev@gmail.com</li>
        </ul>
      </div>

      <div>
        <h2 class="font-bold text-lg text-slate-900">2. Propiedad Intelectual</h2>
        <p>PresuVoz es propietario de todos los derechos de propiedad intelectual e industrial de su página web, así como de los elementos contenidos en la misma (software, imágenes, sonido, audio, vídeo o textos).</p>
      </div>
    </section>
  </div>
</template>
<script setup>
useHead({
  title: 'Aviso Legal | PresuVoz',
  meta: [
    { name: 'description', content: 'Información legal, titularidad y condiciones de uso del sitio web PresuVoz.' },
    { name: 'robots', content: 'noindex, follow' } 
  ]
})
</script>