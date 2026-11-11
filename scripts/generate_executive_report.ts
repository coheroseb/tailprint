import { browserService } from '../src/services/browser.js';
import fs from 'node:fs';

async function generateReport() {
  const html = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body class="bg-slate-100 flex justify-center p-0 m-0">

  <div class="w-[210mm] h-[296mm] bg-white text-slate-800 p-10 flex flex-col justify-between box-border overflow-hidden shadow-2xl relative">
    
    <!-- Top Accent Bar -->
    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-indigo-600 to-emerald-500"></div>

    <!-- Header Section -->
    <div>
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div class="flex items-center space-x-3">
          <span class="px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
            Ledelsesbriefing
          </span>
          <span class="text-xs text-slate-400 font-medium">Børne- & Familieområdet</span>
        </div>
        <div class="text-right text-xs text-slate-500">
          <span class="font-bold text-slate-700">Kilde:</span> Dansk Socialrådgiverforening (Vilkårsundersøgelse 2025)
        </div>
      </div>

      <!-- Main Headline -->
      <div class="mt-5">
        <h1 class="text-2xl font-black text-slate-900 tracking-tight leading-snug">
          Nødråb fra Børneområdet: Ressourcemangel forhindrer indfrielse af Barnets Lov
        </h1>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          En ny landsdækkende rundspørge blandt <strong>1.119 myndighedssocialrådgivere</strong> viser, at gode intentioner om tidlig indsats og børneinddragelse modarbejdes af massivt arbejdspres og manglende normeringer.
        </p>
      </div>

      <!-- Executive TL;DR Box -->
      <div class="mt-4 p-4 rounded-xl bg-slate-50 border-l-4 border-indigo-600 text-slate-700 text-xs leading-relaxed space-y-1">
        <strong class="text-indigo-900 block font-bold text-xs uppercase tracking-wide">Konklusion til Direktion & Ledelse:</strong>
        <span>
          Mens lovens krav om <strong>børneinddragelse lykkes (70 %)</strong>, oplever <strong>75 %</strong>, at sårbare børn venter for længe på hjælp, fordi opgavemængden er steget drastisk uden tilsvarende ressourcer. Risikoen for udbrændthed og fejlbehæftet sagsbehandling er kritisk høj.
        </span>
      </div>

      <!-- 4 Key Metric Cards -->
      <div class="grid grid-cols-4 gap-3 mt-5">
        
        <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
          <span class="block text-3xl font-black text-rose-600">86 %</span>
          <span class="text-[11px] font-bold text-slate-700 mt-1 block">Højt arbejdspres</span>
          <span class="text-[9px] text-slate-500 leading-tight block mt-0.5">45 % føler sig ofte/konstant stressede</span>
        </div>

        <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <span class="block text-3xl font-black text-amber-600">75 %</span>
          <span class="text-[11px] font-bold text-slate-700 mt-1 block">For lang ventetid</span>
          <span class="text-[9px] text-slate-500 leading-tight block mt-0.5">Børn & familier må vente på støtte</span>
        </div>

        <div class="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
          <span class="block text-3xl font-black text-indigo-600">54 % vs 17 %</span>
          <span class="text-[11px] font-bold text-slate-700 mt-1 block">Opgaver vs. Normering</span>
          <span class="text-[9px] text-slate-500 leading-tight block mt-0.5">Flere opgaver, men kun 17 % opnormeret</span>
        </div>

        <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <span class="block text-3xl font-black text-emerald-600">70 %</span>
          <span class="text-[11px] font-bold text-slate-700 mt-1 block">Lyspunkt: Inddragelse</span>
          <span class="text-[9px] text-slate-500 leading-tight block mt-0.5">Børn & unge inddrages bedre i dag</span>
        </div>

      </div>

      <!-- Graphical Data & Benchmarks Section -->
      <div class="mt-5 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center justify-between">
          <span>Undersøgelsens Hovedmålinger (Kvantitative Data)</span>
          <span class="text-[10px] text-slate-400 font-normal">N = 1.119 socialrådgivere</span>
        </h3>

        <div class="space-y-2.5 text-xs">
          <div>
            <div class="flex justify-between text-slate-700 font-semibold mb-1 text-[11px]">
              <span>Oplever et højt eller meget højt arbejdspres</span>
              <span class="text-rose-600 font-bold">86 %</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-rose-500 h-2 rounded-full" style="width: 86%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-slate-700 font-semibold mb-1 text-[11px]">
              <span>Oplever at udsatte børn og familier venter for længe på hjælp</span>
              <span class="text-amber-600 font-bold">75 %</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-amber-500 h-2 rounded-full" style="width: 75%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-slate-700 font-semibold mb-1 text-[11px]">
              <span>Vurderer at Barnets Lov har styrket den direkte børneinddragelse</span>
              <span class="text-emerald-600 font-bold">70 %</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: 70%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-slate-700 font-semibold mb-1 text-[11px]">
              <span>Angiver at arbejdspresset direkte forringer kvaliteten af sagsbehandlingen</span>
              <span class="text-indigo-600 font-bold">57 %</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-indigo-600 h-2 rounded-full" style="width: 57%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actionable Insights & Recommendations -->
      <div class="grid grid-cols-2 gap-4 mt-5">
        
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="text-rose-500 font-bold">⚠️</span>
            <span>Udfordringer & Risici</span>
          </h4>
          <ul class="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
            <li class="flex items-start space-x-1.5">
              <span class="text-slate-400">•</span>
              <span><strong>Tidstyv i administration:</strong> Børneinddragelse tager tid, hvilket uden opnormering skubber sagsbehandlingstiden.</span>
            </li>
            <li class="flex items-start space-x-1.5">
              <span class="text-slate-400">•</span>
              <span><strong>Fejlslagne tidlige indsatser:</strong> Når familier venter for længe, eskalerer problemerne til dyrere anbringelser.</span>
            </li>
            <li class="flex items-start space-x-1.5">
              <span class="text-slate-400">•</span>
              <span><strong>Frafald & stress:</strong> 45 % stressniveau risikerer øget sygefravær og tab af specialkompetencer.</span>
            </li>
          </ul>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="text-emerald-600 font-bold">💡</span>
            <span>Ledelsens Handlingsmuligheder</span>
          </h4>
          <ul class="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
            <li class="flex items-start space-x-1.5">
              <span class="text-emerald-600 font-bold">1.</span>
              <span><strong>Opnormering og sagstakster:</strong> Fastlæg et loft over antal samtidige børnesager pr. rådgiver.</span>
            </li>
            <li class="flex items-start space-x-1.5">
              <span class="text-emerald-600 font-bold">2.</span>
              <span><strong>Nedbring sagsbunkerne:</strong> Allokér midlertidige ressourcer til at få ventetiderne under de lovpligtige tidsfrister.</span>
            </li>
            <li class="flex items-start space-x-1.5">
              <span class="text-emerald-600 font-bold">3.</span>
              <span><strong>Fokus på fastholdelse:</strong> Styrk supervision og psykologisk tryghed for at beskytte personalet mod stress.</span>
            </li>
          </ul>
        </div>

      </div>

    </div>

    <!-- Footer -->
    <div class="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
      <div>
        <span>Udarbejdet via Tailprint AI Scraper & PDF Engine</span> • 
        <span>Undersøgelse udført af Dansk Socialrådgiverforening</span>
      </div>
      <div class="font-bold text-slate-600">
        Side 1 af 1
      </div>
    </div>

  </div>

</body>
</html>`;

  console.log('Rendering 1-page Executive PDF via Tailprint...');
  const pdfBuffer = await browserService.renderPdf({
    html,
    format: 'A4',
    landscape: false,
    print_background: true,
  });

  const targetPath = '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/scratch/executive_rapport_barnets_lov.pdf';
  fs.writeFileSync(targetPath, pdfBuffer);
  console.log('✅ Generated PDF successfully:', targetPath, `(${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

  // Also render PNG preview so the user can inspect it right away!
  console.log('Rendering PNG preview...');
  const pngBuffer = await browserService.renderImage({
    html,
    width: 1240,
    height: 1754,
    type: 'png',
  });
  const pngPath = '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/scratch/executive_rapport_barnets_lov.png';
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('✅ Generated PNG preview successfully:', pngPath, `(${(pngBuffer.length / 1024).toFixed(1)} KB)`);
}

generateReport().catch(console.error);
