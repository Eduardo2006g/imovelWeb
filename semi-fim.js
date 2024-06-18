const puppeteer = require('puppeteer');
const xlsx = require('xlsx');

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0'
  });

  let currentPage = 1;
  const maxPages = 100; // Defina o número máximo de páginas a serem visitadas
  const allData = [];

  while (currentPage <= maxPages) {
    const pageUrl = `https://www.imovelweb.com.br/apartamentos-venda-pagina-${currentPage}-q-guarapari.html`;

    await page.goto(pageUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('body');

    const data = await page.evaluate(() => {
      const enderecoElements = [...document.querySelectorAll('div.LocationAddress-sc-ge2uzh-0.iylBOA.postingAddress')];
      const nomeElements = [...document.querySelectorAll('h2.LocationLocation-sc-ge2uzh-2.fziprF')];
      const infoElements = [...document.querySelectorAll('h3.PostingMainFeaturesBlock-sc-1uhtbxc-0.cHDgeO')];
      const precoElements = [...document.querySelectorAll('div.Price-sc-12dh9kl-3.geYYII')];

      const getText = (element) => element ? element.textContent.trim() : 'N/A';

      const results = enderecoElements.map((_, index) => {
        const endereco = getText(enderecoElements[index]);
        const nome = getText(nomeElements[index]);
        const info = getText(infoElements[index]); 
        
        const preco = getText(precoElements[index]);

        return {
          endereco,
          nome,
          info,
          preco
        };
      });

      return results;
    });

    if (data.length > 0) {
      console.log(`Dados encontrados na página ${currentPage}:`, data);
      allData.push(...data);
    } else {
      console.log(`Nenhum dado encontrado na página ${currentPage}.`);
      break;
    }

    if (data.length < 14) {
      console.log(`Dados insuficientes na página ${currentPage}. Recolhendo mais dados.`);
      break;
    }

    console.log(`URL da página ${currentPage}: ${pageUrl}`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const nextPageButton = await page.$('a[class*="PageArrow-sc-n5babu-2.kTvCSV"]');
      if (nextPageButton) {
        await Promise.all([
          nextPageButton.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
      } else {
        console.log('Botão "Próxima página" não encontrado. Encerrando raspagem.');
        break;
      }
    } catch (error) {
      console.error('Erro ao navegar para a próxima página:', error);
      break;
    }

    currentPage++;
  }

  await browser.close();

  // Grava os dados no arquivo Excel
  const worksheet = xlsx.utils.json_to_sheet(allData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Dados Imóveis');
  xlsx.writeFile(workbook, 'dados_imoveis.xlsx');

  console.log('Dados gravados no arquivo dados_imoveis.xlsx');
}

scrape();
