// Help: the help window, the guided tour and the help texts (src/ui/help/). The bodies are HTML with the tokens
// described in src/ui/help/help.js ([[t:key]], [[eq:id]], [[icon:type]], [[go:…]], [[show:…]], [[act:…]]).
PumpIt.i18n.add('pt-BR', {
  help: {
    title: 'Ajuda do Pump It',
    search: 'Buscar na ajuda…',
    contents: 'Conteúdo da ajuda',
    found: '{n} seção(ões) encontrada(s)',
    noMatch: 'Nada encontrado. Tente outra palavra.',
    prev: 'Anterior',
    next: 'Próximo',
    close: 'Fechar a ajuda',
    tourButton: 'Tour guiado',

    offer: {
      title: 'Novo por aqui?',
      body: 'Faça um tour de um minuto pela tela, ou abra a ajuda quando quiser (F1).',
      tour: 'Fazer o tour',
      help: 'Abrir a ajuda',
      later: 'Agora não',
    },

    tour: {
      step: 'Passo {n} de {total}',
      next: 'Próximo',
      back: 'Voltar',
      done: 'Concluir',
      close: 'Sair do tour',
      steps: {
        menus: {
          title: 'Menus',
          body: 'Em [[t:app.menu.file]] você cria, abre, baixa e exporta modelos, e encontra os exemplos prontos. Em [[t:app.menu.edit]] estão desfazer, copiar, colar, excluir e a grade. Em [[t:app.menu.help]] ficam este tour, a central de ajuda e a referência técnica.',
        },
        title: {
          title: 'Título do modelo',
          body: 'Clique para dar um nome ao modelo. Esse nome também batiza o arquivo quando você baixa o modelo.',
        },
        stamp: {
          title: 'Regime do cálculo',
          body: 'Mostra se o modelo é de líquido (incompressível) ou de gás (compressível) e, no gás, o modelo térmico e o gás. Um clique abre a janela das propriedades do sistema, onde se troca o regime.',
        },
        scenario: {
          title: 'Cenários',
          body: 'Escolha o cenário que está na tela. O botão <b>+</b> cria um cenário filho do atual (por exemplo, a bomba a 90% da rotação); os outros renomeiam e excluem. Cada cenário guarda só o que muda em relação ao pai.',
        },
        status: {
          title: 'Situação do cálculo',
          body: 'Não existe botão de calcular: o modelo é recalculado a cada alteração. Este indicador mostra se falta algo (pendências), se o cálculo convergiu ou se foi recusado. Clique nele para ver a lista de verificação e ir direto ao objeto incompleto.',
        },
        language: {
          title: 'Idioma',
          body: 'Troca toda a interface entre português, inglês e espanhol, na hora. Os nomes que você digitou não são traduzidos.',
        },
        theme: {
          title: 'Modo claro ou escuro',
          body: 'O sol e a lua alternam a tela entre o modo claro e o escuro. Sem uma escolha, o app segue o modo do sistema; a escolha fica guardada neste navegador.',
        },
        tabs: {
          title: 'Abas',
          body: '[[t:app.tabs.net]] é onde você desenha. [[t:app.tabs.data]] lista as entradas em tabelas; [[t:app.tabs.out]] traz vazões, pressões e avisos (o número na aba conta os avisos); [[t:app.tabs.charts]] mostra a bomba contra o sistema e o perfil das linhas de carga.',
        },
        palette: {
          title: 'Paleta',
          body: '[[t:network.palette.select]] (tecla <kbd>V</kbd>) e [[t:network.palette.pipe]] (tecla <kbd>P</kbd>) são as ferramentas. Abaixo vêm os tipos de junção, em grupos. Arraste um tipo para o desenho, ou clique nele e depois no desenho.',
        },
        canvas: {
          title: 'Área de desenho',
          body: 'Clique para selecionar e arraste uma junção para movê-la. Arraste o fundo para mover a vista e use a roda do mouse para aproximar. O clique direito num objeto mostra os dados dele e algumas ações.',
        },
        views: {
          title: 'Vistas',
          body: 'Alterne entre o esquema 2D, a isométrica e o 3D livre (teclas <kbd>1</kbd>, <kbd>2</kbd> e <kbd>3</kbd>). As três mostram o mesmo modelo: a altura de cada junção é a sua elevação.',
        },
        overlay: {
          title: 'Resultados no desenho',
          body: 'Pinte os tubos por vazão, velocidade, queda de pressão, pressão estática ou linha piezométrica. Uma legenda com a escala aparece no canto.',
        },
        zoom: {
          title: 'Zoom',
          body: 'Afaste, enquadre todo o desenho ou aproxime. A roda do mouse e as teclas <kbd>+</kbd>, <kbd>−</kbd> e <kbd>Home</kbd> fazem o mesmo.',
        },
        inspector: {
          title: 'Propriedades',
          body: 'Mostra e edita o objeto selecionado. Com nada selecionado, resume o sistema e traz o botão que abre a janela das propriedades do sistema. O que falta para definir um objeto aparece numa caixa vermelha; o <b>i</b> ao lado de um campo mostra uma nota sobre ele quando o mouse passa por cima.',
        },
        panel: {
          title: 'Recolher o painel',
          body: 'A setinha recolhe o painel de propriedades e devolve o espaço ao desenho; outro clique traz o painel de volta. A escolha fica guardada neste navegador.',
        },
        help: {
          title: 'Ajuda',
          body: 'Volte aqui sempre que precisar. A central de ajuda (<kbd>F1</kbd>) explica cada parte do app e traz a referência técnica do cálculo, com as equações usadas.',
        },
      },
    },

    chapters: {
      start: {
        title: 'Primeiros passos',
        sections: {
          welcome: {
            title: 'Boas-vindas',
            body: `<p>O <b>Pump It</b> calcula redes de tubulação em <b>regime permanente</b>, de líquidos (escoamento incompressível) e de gases ([[go:gas.concept|modo compressível]]). Você desenha a rede — tubos e junções, como reservatórios, bombas e válvulas —, preenche os dados, e o programa encontra as vazões e as pressões em todos os pontos.</p>
<p>Não há botão de calcular: <b>cada alteração recalcula o modelo</b>, desde que os dados necessários estejam completos. Os resultados aparecem em tabelas, em gráficos, no cartão de dados de cada objeto (clique direito) e no próprio desenho.</p>
<h4>Como esta ajuda está organizada</h4>
<ul>
<li><b>Primeiros passos</b>: monte um modelo do zero e entenda o cálculo automático.</li>
<li><b>Guia de uso</b>, do capítulo 2 ao 11: a tela, o desenho, cada tipo de junção, os tubos, o sistema, os cenários, os resultados, os gráficos, as vistas 3D e os arquivos.</li>
<li><b>Referência técnica</b>: as hipóteses, o método de solução e as equações de cada componente.</li>
</ul>
<p>Use a busca no alto para achar um assunto, e os botões <b>Anterior</b> e <b>Próximo</b> para ler em sequência. Os botões tracejados, como [[show:palette|a paleta]], destacam a parte da tela de que o texto fala.</p>
<p>[[act:tour|Fazer o tour guiado pela tela]]</p>`,
          },
          firstModel: {
            title: 'Seu primeiro modelo',
            body: `<p>Vamos montar uma bomba que leva água de um tanque baixo para um tanque elevado. Leva uns cinco minutos.</p>
<ol class="steps">
<li><b>Comece do zero.</b> Abra o menu [[t:app.menu.file]] e escolha [[t:app.menu.new]]. O modelo atual pode ser recuperado com <kbd>Ctrl</kbd>+<kbd>Z</kbd>.</li>
<li><b>Coloque as junções.</b> Na [[show:palette|paleta]], arraste [[icon:reservoir]] [[t:junctions.reservoir.label]] para a esquerda do desenho, [[icon:pump]] [[t:junctions.pump.label]] para o meio e outro [[t:junctions.reservoir.label]] para a direita.</li>
<li><b>Ligue os tubos.</b> Escolha a ferramenta [[t:network.palette.pipe]] (tecla <kbd>P</kbd>) e clique no primeiro reservatório, depois na bomba e depois no segundo reservatório. Pressione <kbd>Esc</kbd> para terminar. Cada tubo aponta da junção clicada primeiro para a segunda, e a bomba precisa de um tubo chegando (sucção) e outro saindo (recalque).</li>
<li><b>Informe o tanque elevado.</b> Clique no reservatório da direita e, no painel [[show:inspector|Propriedades]], mude [[t:junctions.reservoir.elevation]] para 27 m e [[t:junctions.reservoir.form.liquidElev]] para 30 m. A bomba já vem com uma curva de exemplo, e os tubos com 100 m de aço carbono 4" Sch 40.</li>
<li><b>Veja o resultado.</b> Quando nada mais falta, o [[show:status|indicador]] no alto muda para [[t:app.status.calculated]]. Clique com o botão direito num tubo para ver vazão, velocidade e perda de carga, ou selecione a bomba para ver a altura e a potência no painel.</li>
<li><b>Explore.</b> Em [[show:overlay|Resultados no desenho]], escolha [[t:network.overlay.V]] para colorir os tubos. Abra a aba [[t:app.tabs.out]] para as tabelas e a aba [[t:app.tabs.charts]] para ver a curva da bomba contra a do sistema.</li>
</ol>
<p class="tip"><b>Dica:</b> se algo falta, o indicador mostra quantas pendências existem. Clique nele: a lista leva direto ao objeto incompleto, e o painel mostra em vermelho o que precisa ser preenchido.</p>
<p>Próximos passos: experimente um [[go:start.examples|exemplo pronto]], crie um [[go:scenarios.concept|cenário]] com a bomba a 90% da rotação, ou veja a rede nas [[go:views3d.concept|vistas 3D]].</p>`,
          },
          examples: {
            title: 'Exemplos prontos',
            body: `<p>O menu [[t:app.menu.file]] → [[t:app.menu.examples]] abre modelos completos, prontos para explorar. Abrir um exemplo substitui o modelo da tela, mas <kbd>Ctrl</kbd>+<kbd>Z</kbd> traz o seu de volta. Os botões abaixo abrem cada um:</p>
<table>
<tr><th>Exemplo</th><th>O que mostra</th></tr>
<tr><td>[[act:example:pump]]</td><td>Uma bomba entre um tanque de sucção e uma caixa elevada, com válvula gaveta no recalque. O cenário filho roda a bomba a 90% da rotação.</td></tr>
<tr><td>[[act:example:exit]]</td><td>Recalque até um ponto de entrega com pressão residual, modelado com uma válvula de saída.</td></tr>
<tr><td>[[act:example:gravity]]</td><td>Escoamento por gravidade de uma represa para um tanque, através de uma válvula.</td></tr>
<tr><td>[[act:example:threeRes]]</td><td>O problema clássico dos três reservatórios ligados por um nó.</td></tr>
<tr><td>[[act:example:loop]]</td><td>Uma rede malhada de distribuição com consumos nos nós e atrito de Hazen-Williams.</td></tr>
<tr><td>[[act:example:prv]]</td><td>Uma válvula redutora de pressão alimentando um consumo. No cenário de pico, a pressão de montante não basta e a válvula abre totalmente.</td></tr>
<tr><td>[[act:example:sprinkler]]</td><td>Um ramal de aspersores alimentado por uma pressão imposta.</td></tr>
</table>
<p>Um exemplo que você ainda não alterou é refeito no novo idioma quando você troca a língua da interface.</p>`,
          },
          autoCalc: {
            title: 'Cálculo automático',
            body: `<p>O Pump It recalcula o cenário atual a cada alteração. Para isso, o modelo precisa estar completo — é o que confere a <b>lista de verificação</b>.</p>
<h4>O indicador no alto</h4>
<ul>
<li><span class="dot bad"></span> <b>N pendência(s)</b>: algo ainda falta. Clique no indicador para ver a lista; cada objeto incompleto é um link que o seleciona.</li>
<li><span class="dot ok"></span> [[t:app.status.calculated]]: o cálculo convergiu e os resultados estão atualizados.</li>
<li><span class="dot warn"></span> [[t:app.status.notConverged]]: o solver chegou ao limite de iterações. Os números servem só para diagnóstico; veja [[go:system.solution|Controle da solução]].</li>
<li><span class="dot bad"></span> [[t:app.status.refused]]: os dados estão completos, mas a rede não pode ser resolvida — por exemplo, um trecho sem referência de pressão. A mensagem aparece na lista e na linha de status.</li>
</ul>
<h4>O que a lista confere</h4>
<ul>
<li>[[t:core.checklist.items.solution]]: tolerância, iterações e relaxação válidas.</li>
<li>[[t:core.checklist.items.system]]: o fluido definido.</li>
<li>[[t:core.checklist.items.pipes]] e [[t:core.checklist.items.junctions]]: cada objeto com os seus dados e com o número certo de tubos ligados.</li>
</ul>
<p>Num objeto incompleto, o painel [[show:inspector|Propriedades]] mostra a caixa <b>Indefinido</b> com o que falta, e o objeto ganha um contorno vermelho tracejado no desenho.</p>
<p>À direita das abas, a [[show:statusLine|linha de status]] informa quantas iterações o cálculo levou e quanto tempo demorou. Ao trocar de cenário, o novo cenário é calculado na hora.</p>`,
          },
          saving: {
            title: 'Seu trabalho fica salvo',
            body: `<p>Cada alteração é gravada automaticamente no navegador: ao reabrir o Pump It no mesmo computador e no mesmo navegador, o último modelo volta à tela.</p>
<p class="warn"><b>Atenção:</b> essa cópia automática fica só neste navegador, e limpar os dados de navegação a apaga. Para guardar o trabalho de verdade, use [[t:app.menu.file]] → [[t:app.menu.save]] e guarde o arquivo <code>.json</code>.</p>
<ul>
<li><b>Desfazer e refazer:</b> <kbd>Ctrl</kbd>+<kbd>Z</kbd> e <kbd>Ctrl</kbd>+<kbd>Y</kbd>, ou o menu [[t:app.menu.edit]]. O app guarda as últimas 80 alterações. Mexer na câmera das vistas 3D não entra no desfazer.</li>
<li><b>Abrir um arquivo:</b> [[t:app.menu.file]] → [[t:app.menu.open]].</li>
</ul>
<p>Mais detalhes em [[go:files.files|Arquivos]].</p>`,
          },
        },
      },

      screen: {
        title: 'A tela',
        sections: {
          overview: {
            title: 'Visão geral',
            body: `<p>A tela tem cinco áreas. Clique nos botões para ver cada uma destacada:</p>
<ol>
<li>[[show:menus|Barra superior]]: menus, título do modelo, cenários, situação do cálculo, idioma e modo claro ou escuro.</li>
<li>[[show:tabs|Abas]]: [[t:app.tabs.net]], [[t:app.tabs.data]], [[t:app.tabs.out]] e [[t:app.tabs.charts]].</li>
<li>[[show:palette|Paleta]], à esquerda: as ferramentas e os tipos de junção.</li>
<li>[[show:canvas|Área de desenho]], no centro: a rede, as vistas, os resultados no desenho e o zoom.</li>
<li>[[show:inspector|Propriedades]], à direita: os dados do objeto selecionado.</li>
</ol>
<p>Para um passeio completo, com uma explicação curta de cada parte, faça o [[act:tour|tour guiado]].</p>`,
          },
          topbar: {
            title: 'Barra superior',
            body: `<ul>
<li><b>Título</b>: clique no nome ao lado do logotipo para renomear o modelo. O nome também batiza o arquivo baixado.</li>
<li>[[t:app.menu.file]]: novo modelo, abrir, baixar, copiar e colar o modelo como texto JSON, exportar os tubos para o Excel e os exemplos.</li>
<li>[[t:app.menu.edit]]: desfazer, refazer, copiar, colar, selecionar tudo, inverter o sentido de um tubo, excluir, ajustar o desenho à tela e ligar ou desligar a grade.</li>
<li>[[t:app.menu.help]]: esta central de ajuda, o tour guiado, a referência técnica, os atalhos de teclado e informações sobre o app.</li>
<li>[[t:app.scenario.label]]: a lista escolhe o cenário na tela; os botões ao lado criam um cenário filho, renomeiam e excluem. Veja [[go:scenarios.concept|Cenários]].</li>
<li><b>Indicador de cálculo</b>: pendências, convergência e erros. Clique nele para ver a lista de verificação.</li>
<li><b>Idioma</b>: português, inglês ou espanhol.</li>
<li><b>Sol e lua</b>: alternam entre o modo claro e o escuro. Sem uma escolha, o app segue o modo do sistema.</li>
</ul>`,
          },
          tabs: {
            title: 'Abas',
            body: `<ul>
<li>[[t:app.tabs.net]]: o desenho e a edição da rede, com a paleta e o painel de propriedades.</li>
<li>[[t:app.tabs.data]]: as entradas do cenário atual em tabelas de tubos e junções. Veja [[go:results.inputs|Dados do modelo]].</li>
<li>[[t:app.tabs.out]]: o resumo, as tabelas de tubos, junções, bombas e válvulas, e os avisos. O número na aba conta os avisos e fica vermelho quando algum é crítico.</li>
<li>[[t:app.tabs.charts]]: a bomba contra o sistema e o perfil das linhas de carga.</li>
</ul>
<p>À direita das abas fica a linha de status do cálculo.</p>`,
          },
          inspector: {
            title: 'Painel de propriedades',
            body: `<p>O painel à direita muda conforme a seleção:</p>
<ul>
<li><b>Nada selecionado</b>: um resumo do sistema e o botão [[t:inspector.system.open]], que abre a janela [[t:inspector.system.title]] — regime, fluido, ambiente, controle da solução e o cenário atual. Veja [[go:system.fluid|Sistema e solução]].</li>
<li><b>Um tubo</b>: resultados rápidos, nome, geometria, atrito, acessórios e condição especial.</li>
<li><b>Uma junção</b>: resultados rápidos, nome, [[t:inspector.junction.type]], [[t:inspector.junction.elevation]] e os dados próprios do tipo.</li>
<li><b>Vários objetos</b>: a contagem e as ações de copiar, colar e excluir.</li>
</ul>
<h4>Campos</h4>
<ul>
<li>Digite o valor e confirme com <kbd>Enter</kbd> ou saindo do campo. Vírgula ou ponto servem como separador decimal.</li>
<li>Ao lado de cada grandeza há uma lista de unidades. <b>Trocar a unidade não converte o número</b>: o valor passa a ser lido na nova unidade. Escolha a unidade primeiro e digite o valor nela.</li>
<li>Num cenário filho, um ponto colorido ao lado do rótulo indica um valor alterado neste cenário. Clique no ponto para voltar a herdar o valor do pai.</li>
<li>A caixa vermelha <b>Indefinido</b> lista o que falta para o objeto entrar no cálculo.</li>
<li>Um <b>i</b> num círculo, ao lado de um campo ou do título de uma seção, guarda uma nota: passe o mouse sobre ele, ou chegue nele com <kbd>Tab</kbd>, para ler.</li>
</ul>
<h4>Recolher o painel</h4>
<p>A [[show:panel|setinha]] na borda esquerda do painel o recolhe, e o desenho ganha o espaço; outro clique o traz de volta. A escolha fica guardada neste navegador. Ir a um objeto pela lista de verificação, pelas tabelas ou pelos avisos abre o painel de novo.</p>`,
          },
          units: {
            title: 'Unidades',
            body: `<p>Cada campo guarda o valor exatamente como foi digitado, com a sua unidade, e o cálculo converte tudo para o SI internamente. As unidades padrão são vazão em m³/h, comprimento e cota em m, pressão em kgf/cm²(g) e temperatura em °C; diâmetros e rugosidade, em mm.</p>
<h4>Pressão manométrica e absoluta</h4>
<p>Unidades com <b>(g)</b> são manométricas, relativas à pressão ambiente; com <b>(a)</b>, absolutas. A conversão usa a [[t:inspector.system.patm]] do modelo:</p>
[[eq:gauge]]
<p>Diferenças de pressão (queda de pressão, ΔP de ajuste) não levam (g) nem (a).</p>
<h4>Unidades dos resultados</h4>
<p>Nas tabelas de resultados e nos gráficos, cada coluna numérica tem a própria lista de unidades no cabeçalho. Ali, trocar a unidade <b>converte</b> os valores mostrados, sem recalcular, e a escolha fica guardada para as próximas vezes.</p>
<p>Os números seguem o idioma: vírgula decimal em português e espanhol, ponto em inglês. Ao digitar, qualquer um dos dois é aceito.</p>`,
          },
        },
      },

      draw: {
        title: 'Desenhar a rede',
        sections: {
          place: {
            title: 'Colocar junções',
            body: `<p>Há dois jeitos de pôr uma junção no desenho:</p>
<ul>
<li><b>Arrastar</b> o tipo da [[show:palette|paleta]] até o lugar desejado; ou</li>
<li><b>Clicar</b> no tipo e depois no desenho. Segure <kbd>Shift</kbd> ao clicar para continuar colocando o mesmo tipo.</li>
</ul>
<p>Com a grade ligada ([[t:app.menu.edit]] → [[t:app.menu.grid]]), as junções encaixam nos pontos da grade. A junção nova fica selecionada, pronta para receber os dados no painel.</p>
<p>A posição no esquema <b>não</b> entra no cálculo: valem os dados, como a [[t:inspector.junction.elevation]] de cada junção e o comprimento de cada tubo.</p>
<p>Para conhecer cada tipo, veja [[go:junctions.overview|Tipos de junção]].</p>`,
          },
          pipes: {
            title: 'Desenhar tubos',
            body: `<ol class="steps">
<li>Escolha a ferramenta [[t:network.palette.pipe]] na paleta, ou pressione <kbd>P</kbd>.</li>
<li>Clique numa junção (ela fica destacada) e depois em outra: o tubo é criado entre as duas.</li>
<li>Continue clicando para desenhar em cadeia: cada clique liga a última junção à próxima.</li>
<li>Clique num ponto vazio para criar ali um [[icon:branch]] [[t:junctions.branch.label]] e ligá-lo.</li>
<li>Pressione <kbd>Esc</kbd> para soltar a última junção; de novo, para sair da ferramenta.</li>
</ol>
<h4>Dados de um tubo novo</h4>
<p>O tubo novo copia comprimento, material, seção e atrito do tubo selecionado ou, se nenhum estiver selecionado, do último criado. O primeiro tubo de um modelo nasce com 100 m de aço carbono 4" Sch 40. O comprimento desenhado <b>nunca</b> conta: informe o comprimento real no painel.</p>
<h4>Sentido de referência</h4>
<p>O tubo aponta da junção clicada primeiro para a segunda, como mostra a seta no desenho. Vazões no sentido de referência são positivas; contra ele, negativas. Depois do cálculo, a seta mostra o sentido real do escoamento. Veja [[go:draw.direction|Sentido e sinais]].</p>`,
          },
          select: {
            title: 'Selecionar, mover e navegar',
            body: `<table>
<tr><th>Ação</th><th>Como</th></tr>
<tr><td>Selecionar</td><td>Clique no objeto com a ferramenta [[t:network.palette.select]] (tecla <kbd>V</kbd>).</td></tr>
<tr><td>Somar ou tirar da seleção</td><td><kbd>Ctrl</kbd>+clique ou <kbd>Shift</kbd>+clique.</td></tr>
<tr><td>Selecionar por área</td><td><kbd>Shift</kbd>+arrastar num ponto vazio: entram as junções dentro do retângulo e os tubos com as duas pontas dentro.</td></tr>
<tr><td>Selecionar tudo</td><td><kbd>Ctrl</kbd>+<kbd>A</kbd>.</td></tr>
<tr><td>Limpar a seleção</td><td>Clique num ponto vazio.</td></tr>
<tr><td>Mover</td><td>Arraste uma junção. Se ela fizer parte de uma seleção, o grupo inteiro vai junto.</td></tr>
<tr><td>Mover a vista</td><td>Arraste o fundo, ou use o botão do meio do mouse.</td></tr>
<tr><td>Aproximar e afastar</td><td>Roda do mouse, as teclas <kbd>+</kbd> e <kbd>−</kbd>, ou os botões de [[show:zoom|zoom]].</td></tr>
<tr><td>Enquadrar tudo</td><td>Tecla <kbd>Home</kbd>, o botão [[t:network.zoom.fit]] ou [[t:app.menu.edit]] → [[t:app.menu.fit]].</td></tr>
</table>`,
          },
          edit: {
            title: 'Editar, copiar e excluir',
            body: `<ul>
<li><b>Dados</b>: selecione o objeto e edite no painel [[show:inspector|Propriedades]].</li>
<li><b>Trocar o tipo de uma junção</b>: no painel, mude [[t:inspector.junction.type]]. Nome, cota, posição e os dados compatíveis — como as perdas por tubo e o modelo de perda das válvulas — são mantidos.</li>
<li><b>Inverter o sentido de um tubo</b>: o botão [[t:inspector.pipe.reverse]] no painel, o menu [[t:app.menu.edit]] → [[t:app.menu.reverse]] ou o clique direito no tubo.</li>
<li><b>Copiar e colar</b>: <kbd>Ctrl</kbd>+<kbd>C</kbd> copia as junções selecionadas, as pontas dos tubos selecionados e os tubos entre elas, com os valores do cenário atual; <kbd>Ctrl</kbd>+<kbd>V</kbd> cola uma cópia deslocada, e cada nova colagem desloca um pouco mais.</li>
<li><b>Excluir</b>: <kbd>Del</kbd>. Excluir uma junção exclui também os tubos ligados a ela.</li>
<li><b>Desfazer e refazer</b>: <kbd>Ctrl</kbd>+<kbd>Z</kbd> e <kbd>Ctrl</kbd>+<kbd>Y</kbd>.</li>
</ul>
<p class="tip"><b>Dica:</b> os atalhos não agem enquanto você digita num campo. Assim, <kbd>Del</kbd> apaga texto, e não objetos.</p>`,
          },
          context: {
            title: 'Cartão de dados (clique direito)',
            body: `<p>Clique com o botão direito num tubo ou numa junção para abrir o cartão de dados, com os principais números do objeto nas unidades padrão.</p>
<ul>
<li><b>Tubo</b>: comprimento, diâmetro, cotas, vazão, velocidade com a faixa de velocidade, perda de carga, pressões de estagnação e estáticas, Reynolds, fator de atrito, K dos acessórios e o sentido do escoamento.</li>
<li><b>Junção</b>: cota, pressões, vazão através e os resultados próprios do tipo, como a altura de uma bomba, o estado de uma válvula de controle ou o Cv equivalente de uma válvula.</li>
</ul>
<p>No pé do cartão ficam as ações: [[t:network.menu.reverse]] (só tubos), [[t:network.menu.copy]], [[t:network.menu.paste]] e [[t:network.menu.delete]].</p>`,
          },
          direction: {
            title: 'Sentido e sinais',
            body: `<p>Todo tubo tem um <b>sentido de referência</b>, da junção de origem para a de destino. Ele não obriga o fluido a correr para lá: se a vazão resultar negativa, o escoamento é contrário ao de referência, e a seta do desenho se inverte depois do cálculo.</p>
<p>Alguns componentes dependem do sentido:</p>
<ul>
<li>[[icon:pump]] [[t:junctions.pump.label]] e [[icon:control]] [[t:junctions.control.label]] precisam de exatamente um tubo chegando e um saindo; o escoamento previsto vai do tubo que chega para o que sai.</li>
<li>Nos outros componentes de duas portas — [[t:junctions.valve.label]], [[t:junctions.orifice.label]] e [[t:junctions.generic.label]] —, o K se refere ao tubo de montante, conforme o sentido real do escoamento.</li>
</ul>
<p>Para corrigir um tubo desenhado ao contrário, use [[t:inspector.pipe.reverse]]. Fluxo contra o sentido de referência num componente gera um aviso de cautela, porque o K informado pode não valer nesse sentido.</p>`,
          },
        },
      },

      junctions: {
        title: 'Tipos de junção',
        sections: {
          overview: {
            title: 'Visão geral',
            body: `<p>As junções ficam nas pontas dos tubos. Na paleta, elas estão agrupadas assim:</p>
<table>
<tr><th>Grupo</th><th>Tipo</th><th>Tubos</th><th>Papel</th></tr>
<tr><td>[[t:junctions.groups.boundary]]</td><td>[[icon:reservoir]] [[t:junctions.reservoir.label]]</td><td>1 a 25</td><td>Pressão conhecida na superfície do líquido</td></tr>
<tr><td></td><td>[[icon:pressure]] [[t:junctions.pressure.label]]</td><td>1 a 25</td><td>Pressão conhecida num ponto</td></tr>
<tr><td></td><td>[[icon:flow]] [[t:junctions.flow.label]]</td><td>1</td><td>Vazão conhecida entrando ou saindo</td></tr>
<tr><td></td><td>[[icon:spray]] [[t:junctions.spray.label]]</td><td>1 a 4</td><td>Descarga por uma área efetiva para uma pressão externa</td></tr>
<tr><td>[[t:junctions.groups.connection]]</td><td>[[icon:branch]] [[t:junctions.branch.label]]</td><td>2 a 25</td><td>Encontro de tubos, com fonte ou consumo opcional</td></tr>
<tr><td>[[t:junctions.groups.equipment]]</td><td>[[icon:pump]] [[t:junctions.pump.label]]</td><td>2</td><td>Adiciona carga segundo a curva altura × vazão</td></tr>
<tr><td>[[t:junctions.groups.valves]]</td><td>[[icon:valve]] [[t:junctions.valve.label]]</td><td>2</td><td>Perda por K, Cv ou Kv; pode estar fechada</td></tr>
<tr><td></td><td>[[icon:control]] [[t:junctions.control.label]]</td><td>2</td><td>Mantém uma pressão, uma vazão ou um ΔP</td></tr>
<tr><td></td><td>[[icon:exitvalve]] [[t:junctions.exitvalve.label]]</td><td>1</td><td>Descarga para uma pressão residual</td></tr>
<tr><td>[[t:junctions.groups.losses]]</td><td>[[icon:orifice]] [[t:junctions.orifice.label]]</td><td>2</td><td>Placa de orifício</td></tr>
<tr><td></td><td>[[icon:generic]] [[t:junctions.generic.label]]</td><td>2</td><td>Perda por K ou por uma curva ΔP × vazão</td></tr>
</table>
<h4>Referência de pressão</h4>
<p>Cada parte ligada da rede precisa de pelo menos uma junção que fixe a pressão: [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]], [[t:junctions.spray.label]] ou [[t:junctions.exitvalve.label]] (ou uma válvula de controle de pressão em ação). Sem isso, o cálculo é recusado com a mensagem de trecho sem referência de pressão.</p>
<h4>Cota e perdas por tubo</h4>
<p>Toda junção tem uma [[t:inspector.junction.elevation]], usada no termo de gravidade das equações. [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]] e [[t:junctions.branch.label]] têm ainda a tabela [[t:inspector.pipeLosses.title]], com um K de saída e um de chegada para cada tubo ligado. Veja [[go:pipes.ends|Perdas nas pontas]].</p>`,
          },
          reservoir: {
            title: 'Reservatório',
            body: `<p>[[icon:reservoir]] Um tanque ou lago com superfície livre: o nível do líquido e a pressão sobre ele são conhecidos. É a referência de pressão mais comum.</p>
<h4>Dados</h4>
<ul>
<li>[[t:junctions.reservoir.elevation]]: a cota onde os tubos se ligam, salvo indicação diferente na tabela de perdas por tubo.</li>
<li>[[t:junctions.reservoir.form.liquidElev]]: o nível do líquido, como cota absoluta (não como altura acima do fundo).</li>
<li>[[t:junctions.reservoir.form.surfP]]: 0 kgf/cm²(g) para um tanque aberto; outro valor para um vaso pressurizado.</li>
<li>[[t:inspector.pipeLosses.title]]: o K de saída do tanque para cada tubo (uma entrada de borda viva, por exemplo, tem 0,5), o K de chegada do tubo ao tanque (uma saída para o tanque, 1,0) e a cota de conexão de cada tubo (em branco, o fundo).</li>
</ul>
<h4>Como é calculado</h4>
<p>O reservatório é um nó de pressão de estagnação igual à pressão na superfície, na cota do nível. Sem K informado, a pressão de estagnação é contínua entre o tanque e a ponta do tubo. Um tubo ligado acima do nível do líquido descarrega em queda livre; se ele tentar puxar líquido do tanque, aparece um aviso.</p>
<p>Nos resultados, cada reservatório aparece em [[t:results.boundaries.title]], com a vazão que entra na rede ou sai dela por ali.</p>`,
          },
          pressure: {
            title: 'Pressão imposta',
            body: `<p>[[icon:pressure]] Um ponto de pressão conhecida, como a ligação com uma rede pública ou um coletor mantido a pressão constante.</p>
<ul>
<li>[[t:junctions.pressure.form.ptype]]: [[t:junctions.pressure.form.stagnation]] (a pressão total no nó, a escolha usual) ou [[t:junctions.pressure.form.static]], que vale para o único tubo ligado: a pressão estática é a de estagnação menos ½ρV² desse tubo.</li>
<li>[[t:junctions.pressure.form.P]]: o valor imposto.</li>
</ul>
<p>Aceita até 25 tubos (no tipo estático, só 1) e tem a tabela de perdas por tubo. Serve como referência de pressão.</p>`,
          },
          flow: {
            title: 'Vazão imposta',
            body: `<p>[[icon:flow]] Uma vazão conhecida que <b>sai</b> do sistema (um consumo) ou <b>entra</b> nele (uma alimentação), na ponta de um único tubo.</p>
<ul>
<li>[[t:junctions.flow.form.Q]]: valor positivo, em massa ou em volume.</li>
<li>[[t:junctions.flow.form.dir]]: [[t:junctions.flow.form.out]] ou [[t:junctions.flow.form.in]].</li>
</ul>
<p>Uma vazão imposta não fixa a pressão: a rede precisa de uma referência de pressão em outro ponto. Com vazão zero, a junção funciona como uma ponta fechada.</p>`,
          },
          spray: {
            title: 'Bocal / aspersor',
            body: `<p>[[icon:spray]] Um bocal, aspersor ou chuveiro que descarrega para uma pressão externa, normalmente a atmosfera. A vazão depende da pressão disponível na entrada.</p>
<ul>
<li>[[t:junctions.spray.form.CdA]]: informe [[t:junctions.spray.form.dHole]], [[t:junctions.spray.form.nHoles]] e o coeficiente de descarga Cd.</li>
<li>[[t:junctions.spray.form.K]]: o fator K de catálogo, com Q = K·√ΔP (em L/min/bar½, gpm/psi½ ou m³/h/bar½). Ele pressupõe água.</li>
<li>[[t:junctions.spray.form.Pext]]: a pressão para onde descarrega; 0 kgf/cm²(g) para a atmosfera.</li>
</ul>
<p>Aceita de 1 a 4 tubos e serve como referência de pressão. As equações estão em [[go:tech.valves|Válvulas, orifícios e bocais]].</p>`,
          },
          branch: {
            title: 'Nó',
            body: `<p>[[icon:branch]] O encontro de dois ou mais tubos: um tê, uma cruzeta, uma mudança de diâmetro ou de material. A pressão de estagnação é a mesma para todos os tubos, salvo as perdas informadas na tabela de perdas por tubo.</p>
<ul>
<li>[[t:junctions.branch.form.source]]: positiva entra no sistema; negativa sai dele (um consumo concentrado). Na maioria dos casos, zero.</li>
</ul>
<p>A ferramenta [[t:network.palette.pipe]] cria um nó automaticamente quando você clica num ponto vazio.</p>`,
          },
          pump: {
            title: 'Bomba',
            body: `<p>[[icon:pump]] Adiciona energia ao escoamento segundo a curva de altura manométrica × vazão. Precisa de um tubo chegando (sucção) e de outro saindo (recalque).</p>
<h4>Estado e modo</h4>
<ul>
<li>[[t:junctions.pump.form.state]]: [[t:junctions.pump.form.on]], [[t:junctions.pump.form.offClosed]] (vazão zero) ou [[t:junctions.pump.form.offOpen]] (nem ganho nem perda).</li>
<li>[[t:junctions.pump.form.modes.curve]]: a bomba trabalha sobre a curva, na velocidade informada (em % da nominal).</li>
<li>[[t:junctions.pump.form.modes.fixedFlow]]: a bomba entrega a vazão informada e o cálculo mostra a altura necessária. Não usa curva — é o modo para escolher uma bomba.</li>
<li>[[t:junctions.pump.form.modes.controlFlow]], [[t:junctions.pump.form.modes.controlDischarge]] e [[t:junctions.pump.form.modes.controlSuction]]: a velocidade se ajusta para manter a vazão ou a pressão estática de ajuste, e o resultado mostra a velocidade necessária.</li>
<li>[[t:junctions.pump.form.nPumps]]: bombas idênticas lado a lado; cada uma leva a vazão total dividida por N.</li>
</ul>
<h4>Curvas</h4>
<p>Informe pontos da [[t:junctions.pump.curves.head]] e, se quiser, da eficiência e do NPSH requerido. Em cada tabela escolha as unidades e o [[t:inspector.curve.fitType]] (polinômio de ordem 0 a 4 ou interpolação linear); o gráfico ao lado mostra os pontos e a curva ajustada, e o cálculo sempre usa a curva ajustada. Sem curva de eficiência, a potência no eixo é igual à hidráulica.</p>
<h4>Resultados</h4>
<p>Altura manométrica, ganho de pressão, velocidade, potências hidráulica e no eixo, eficiência e NPSH disponível e requerido. Os avisos alertam para refluxo, operação além do fim da curva, NPSH insuficiente e curvas mal ajustadas. O gráfico [[t:charts.tabs.pump]] mostra o ponto de operação. As equações estão em [[go:tech.pumps|Bombas]].</p>`,
          },
          valve: {
            title: 'Válvula',
            body: `<p>[[icon:valve]] Uma válvula, ou qualquer componente em linha com perda localizada conhecida.</p>
<ul>
<li>[[t:junctions.lossModel.label]]: [[t:junctions.lossModel.K]], [[t:junctions.lossModel.Cv]] ou [[t:junctions.lossModel.Kv]].</li>
<li>[[t:junctions.valve.form.closed]]: vazão zero. Nas vistas 3D, a válvula fechada aparece em vermelho.</li>
</ul>
<p>Os resultados trazem a queda de pressão, o K efetivo e o Cv equivalente. Para perdas que acompanham o tubo, como curvas e válvulas de bloqueio sempre abertas, também dá para usar a lista de [[go:pipes.fittings|acessórios do tubo]].</p>`,
          },
          control: {
            title: 'Válvula de controle',
            body: `<p>[[icon:control]] Uma válvula que se ajusta sozinha para manter um valor. Precisa de um tubo chegando e de outro saindo.</p>
<table>
<tr><th>[[t:junctions.control.form.ctype]]</th><th>Mantém</th></tr>
<tr><td>[[t:junctions.control.form.types.PRV]]</td><td>a pressão a jusante</td></tr>
<tr><td>[[t:junctions.control.form.types.PSV]]</td><td>a pressão a montante</td></tr>
<tr><td>[[t:junctions.control.form.types.FCV]]</td><td>a vazão</td></tr>
<tr><td>[[t:junctions.control.form.types.PDCV]]</td><td>a queda de pressão através dela</td></tr>
</table>
<ul>
<li>[[t:junctions.control.form.basis]] (PRV e PSV): pressão estática (a usual) ou de estagnação.</li>
<li>[[t:junctions.control.form.alwaysControl]]: ligado, a válvula mantém o ajuste mesmo quando precisaria adicionar pressão, e o resultado avisa, porque uma válvula real não faz isso. Desligado, ela pode abrir totalmente ou fechar quando não consegue controlar.</li>
<li>[[t:junctions.control.form.kOpen]]: a perda da válvula totalmente aberta.</li>
<li>[[t:junctions.control.form.failAction]] (FCV): abrir totalmente ou fechar.</li>
<li>[[t:junctions.control.form.special]]: força a válvula fechada ou totalmente aberta, ignorando o ajuste.</li>
</ul>
<p>O estado resultante — controlando, totalmente aberta ou fechada — aparece no painel e na tabela de válvulas. Detalhes em [[go:tech.valves|Válvulas, orifícios e bocais]].</p>`,
          },
          exitvalve: {
            title: 'Válvula de saída',
            body: `<p>[[icon:exitvalve]] A ponta de um tubo que descarrega, através de uma válvula, para uma pressão residual conhecida — o ponto de entrega de uma adutora, por exemplo. Aceita um único tubo e serve como referência de pressão.</p>
<ul>
<li>[[t:junctions.exitvalve.elevation]]: a cota da saída.</li>
<li>[[t:junctions.exitvalve.form.Pout]]: a pressão depois da válvula.</li>
<li>[[t:junctions.lossModel.label]]: K, Cv ou Kv. Com K = 0, a pressão de estagnação na ponta do tubo é igual à residual.</li>
</ul>
<p>Se a pressão residual for maior que a da rede, o fluido entraria pela saída, e um aviso indica isso.</p>`,
          },
          orifice: {
            title: 'Orifício',
            body: `<p>[[icon:orifice]] Uma placa de orifício entre dois tubos, usada para medir ou limitar a vazão.</p>
<ul>
<li>[[t:junctions.orifice.form.sharp]] e [[t:junctions.orifice.form.rounded]]: o K vem das correlações de Idelchik, a partir do [[t:junctions.orifice.form.dO]] (e do [[t:junctions.orifice.form.rEdge]], no arredondado) e das áreas dos tubos.</li>
<li>[[t:junctions.orifice.form.Cd]]: K = (1 − β⁴)/Cd² sobre a velocidade no orifício, convertido para o tubo de montante.</li>
<li>[[t:junctions.orifice.form.K]]: um K direto, referido ao tubo de montante.</li>
</ul>
<p>O orifício precisa ser menor que os tubos. As fórmulas estão em [[go:tech.valves|Válvulas, orifícios e bocais]].</p>`,
          },
          generic: {
            title: 'Componente genérico',
            body: `<p>[[icon:generic]] Qualquer componente cuja perda você conhece: um filtro, um trocador de calor, um medidor.</p>
<ul>
<li>[[t:junctions.generic.form.K]]: perda K·ρV²/2, com a velocidade do tubo de montante.</li>
<li>[[t:junctions.generic.form.curve]]: pontos de queda de pressão × vazão de catálogo (no mínimo 2), com o tipo de ajuste à escolha.</li>
</ul>`,
          },
        },
      },

      pipes: {
        title: 'Tubos',
        sections: {
          geometry: {
            title: 'Geometria e material',
            body: `<ul>
<li>[[t:inspector.pipe.length]]: o comprimento hidráulico real. O desenho não interfere.</li>
<li>[[t:inspector.pipe.material]]: [[t:inspector.pipe.steel]] — escolha [[t:inspector.pipe.nps]] e [[t:inspector.pipe.schedule]] (40, 80, STD ou XS), e o diâmetro interno vem da norma —, ou [[t:inspector.pipe.userDefined]], para informar o diâmetro.</li>
<li>[[t:inspector.pipe.section]]: [[t:inspector.pipe.sections.circular]], [[t:inspector.pipe.sections.annulus]] (diâmetros externo e interno), [[t:inspector.pipe.sections.rectangular]] (largura e altura) ou [[t:inspector.pipe.sections.noncircular]] (área e perímetro molhado). O painel mostra o [[t:inspector.pipe.hydraulicDiameter]].</li>
<li>[[t:inspector.pipe.idReduction]]: reduz o diâmetro hidráulico em porcentagem, para simular depósitos nas paredes.</li>
<li>[[t:inspector.pipe.nParallel]]: N tubos iguais lado a lado; a vazão se divide igualmente entre eles.</li>
<li>[[t:inspector.pipe.special]]: [[t:inspector.pipe.closed]].</li>
</ul>`,
          },
          friction: {
            title: 'Atrito',
            body: `<p>Escolha o [[t:inspector.pipe.model]] de atrito:</p>
<ul>
<li>[[t:inspector.pipe.models.roughness]] (padrão): informe ε, ou escolha um [[t:inspector.pipe.typicalValue]] — aço comercial 0,046 mm, ferro galvanizado 0,15 mm, PVC 0,0015 mm e outros.</li>
<li>[[t:inspector.pipe.models.relRoughness]]: o valor de ε/D direto.</li>
<li>[[t:inspector.pipe.models.smooth]]: ε = 0.</li>
<li>[[t:inspector.pipe.models.explicitF]]: um fator de atrito de Darcy constante.</li>
<li>[[t:inspector.pipe.models.hw]]: o coeficiente C, comum em redes de água; não depende da viscosidade.</li>
<li>[[t:inspector.pipe.models.frictionless]]: só para testes; não use em projeto.</li>
</ul>
<p>As equações — Darcy-Weisbach, Colebrook e a transição entre laminar e turbulento — estão em [[go:tech.friction|Atrito nos tubos]].</p>`,
          },
          fittings: {
            title: 'Acessórios',
            body: `<p>A seção [[t:inspector.fittings.title]] lista as perdas localizadas do tubo: curvas, tês, válvulas de bloqueio, entradas e saídas.</p>
<ol class="steps">
<li>Em [[t:inspector.fittings.add]], escolha um item da biblioteca, ou [[t:core.data.fittings.custom]] para digitar um K.</li>
<li>Ajuste a quantidade e, se quiser, o valor.</li>
</ol>
<p>Os itens marcados com <b>·f<sub>T</sub></b> seguem o método K/f<sub>T</sub> do Crane TP-410: K = n·f<sub>T</sub>, com f<sub>T</sub> calculado para o diâmetro interno real do tubo (o painel mostra [[t:inspector.fittings.craneFT]]). Os demais têm K constante. A soma, [[t:inspector.fittings.sumK]], age sobre a velocidade do tubo, como uma perda distribuída ao longo dele.</p>
<p class="tip"><b>Dica:</b> para uma válvula que você quer abrir, fechar ou acompanhar nos resultados, prefira a junção [[t:junctions.valve.label]].</p>`,
          },
          ends: {
            title: 'Perdas nas pontas',
            body: `<p>Nas junções de um nó só — [[t:junctions.reservoir.label]], [[t:junctions.pressure.label]] e [[t:junctions.branch.label]] —, a tabela [[t:inspector.pipeLosses.title]] define, para cada tubo ligado:</p>
<ul>
<li>[[t:inspector.pipeLosses.kOut]]: a perda quando o fluido sai da junção e entra no tubo (por exemplo, uma entrada de borda viva, 0,5).</li>
<li>[[t:inspector.pipeLosses.kIn]]: a perda quando o fluido chega do tubo à junção (por exemplo, a saída para um tanque, 1,0).</li>
<li>[[t:inspector.pipeLosses.elevation]] (só no reservatório): a cota onde aquele tubo se liga; em branco, o fundo.</li>
</ul>
<p>Cada K usa a área do próprio tubo e só age no sentido correspondente do escoamento.</p>`,
          },
        },
      },

      system: {
        title: 'Sistema e solução',
        sections: {
          fluid: {
            title: 'Fluido',
            body: `<p>As propriedades do sistema ficam na janela [[t:inspector.system.title]]. Ela abre pelo [[show:stamp|selo do regime]], ao lado do título do modelo; pelo menu [[t:app.menu.edit]] → [[t:app.menu.system]]; pelos itens do sistema na lista de verificação; ou pelo botão [[t:inspector.system.open]] do painel, com nada selecionado. Cada alteração vale na hora, como no painel. No topo da janela fica o [[t:inspector.system.regime]]; com [[t:inspector.system.regimes.incompressible]], a seção [[t:inspector.system.fluid]] traz:</p>
<ul>
<li>[[t:core.fluids.water.label]]: informe a [[t:inspector.system.temperature]] (de 0 a 150 °C); densidade, viscosidade e pressão de vapor vêm de correlações públicas.</li>
<li>[[t:inspector.system.userDefined]]: informe a densidade, a viscosidade dinâmica e, se quiser os avisos de cavitação, a pressão de vapor.</li>
</ul>
<p>Os valores em uso (ρ, μ e Pv) aparecem logo abaixo. Nesse regime o fluido tem densidade constante e uma só temperatura; para gases, veja [[go:gas.concept|o modo compressível]]. As correlações estão em [[go:tech.fluid|Propriedades da água]].</p>`,
          },
          environment: {
            title: 'Ambiente e escoamento',
            body: `<ul>
<li>[[t:inspector.system.patm]]: converte pressões manométricas em absolutas e entra no NPSH disponível. O padrão, 1,03323 kgf/cm²(a), é o nível do mar.</li>
<li>[[t:inspector.system.gravity]]: múltiplo da gravidade padrão, g₀ = 9,80665 m/s².</li>
<li>[[t:inspector.system.reLam]] e [[t:inspector.system.reTurb]]: os limites do regime (2300 e 4000, por padrão). Entre eles, o fator de atrito é interpolado linearmente.</li>
<li>[[t:inspector.system.laminarK]]: em escoamento laminar, as perdas dos acessórios crescem. [[t:inspector.system.improvedAtkf]] (padrão) e ATKF multiplicam o K pela razão entre o fator de atrito laminar e um fator turbulento de referência; [[t:inspector.system.noCorrection]] usa o K como foi informado. Detalhes em [[go:tech.minor|Perdas localizadas]].</li>
</ul>`,
          },
          solution: {
            title: 'Controle da solução',
            body: `<ul>
<li>[[t:inspector.system.tolRel]] (padrão 0,0001): o cálculo para quando a variação relativa de todas as vazões e pressões fica abaixo dela em duas iterações seguidas.</li>
<li>[[t:inspector.system.maxIter]] (padrão 500): o limite de iterações.</li>
<li>[[t:inspector.system.relax]] (padrão 1): a fração do passo de Newton aplicada a cada iteração, entre 0 e 1.</li>
<li>[[t:inspector.system.adaptive]] (ligada): reduz o passo pela metade quando ele piora os resíduos.</li>
<li>[[t:inspector.system.checkMass]] (ligada): confere a conservação de massa em cada junção e avisa se algo não fecha.</li>
</ul>
<p class="tip"><b>Se o cálculo não convergir:</b> confira os dados (curvas de bomba coerentes, válvulas de controle com ajustes possíveis), deixe a relaxação adaptativa ligada e tente uma relaxação menor, como 0,5. Uma relaxação próxima da tolerância pode parecer convergida sem estar — o app avisa quando isso acontece.</p>
<p>O método está em [[go:tech.newton|Método de solução]].</p>`,
          },
        },
      },

      scenarios: {
        title: 'Cenários',
        sections: {
          concept: {
            title: 'Como funcionam',
            body: `<p>Cenários permitem comparar variações do mesmo sistema — outra rotação, uma válvula fechada, uma demanda de pico — sem duplicar o modelo.</p>
<ul>
<li>O cenário <b>Base</b> define tudo. Cada cenário filho guarda <b>só o que muda</b> em relação ao pai; o resto é herdado.</li>
<li>Mudar um valor no pai muda também os filhos que não alteraram aquele atributo.</li>
<li>A <b>topologia é a mesma</b> em todos os cenários: incluir ou excluir tubos e junções vale para todos. Para "tirar" um trecho num cenário, feche o tubo ou a válvula nele.</li>
<li>Cada cenário tem os próprios resultados, calculados quando ele vai para a tela.</li>
</ul>`,
          },
          working: {
            title: 'Criar e comparar',
            body: `<ol class="steps">
<li>Escolha na lista [[t:app.scenario.label]] o cenário que será o pai e clique em <b>+</b>. Dê um nome ao novo cenário: ele passa a ser o atual.</li>
<li>Altere os valores que diferem. Um ponto colorido aparece ao lado de cada campo alterado; clique no ponto para voltar a herdar o valor do pai.</li>
<li>Troque de cenário pela lista para comparar os resultados.</li>
</ol>
<ul>
<li>Na seção [[t:inspector.system.scenario]] (na janela [[t:inspector.system.title]]) ficam as notas do cenário, a contagem de atributos alterados e o botão [[t:inspector.system.showDiffs]], com a tabela "neste cenário × no pai".</li>
<li>Na aba [[t:app.tabs.data]], as células que diferem do pai ficam destacadas.</li>
<li>Os botões ao lado da lista renomeiam e excluem o cenário atual, junto com os seus filhos. O cenário Base não pode ser excluído.</li>
</ul>`,
          },
        },
      },

      results: {
        title: 'Resultados',
        sections: {
          overlay: {
            title: 'Resultados no desenho',
            body: `<p>A lista [[show:overlay|Resultados no desenho]], no canto inferior da área de desenho, colore os tubos por uma grandeza e escreve os valores ao lado deles:</p>
<ul>
<li>[[t:network.overlay.Q]], [[t:network.overlay.V]] e [[t:network.overlay.dP0]]: os valores de cada tubo.</li>
<li>[[t:network.overlay.P]] e [[t:network.overlay.HGL]]: a média entre a entrada e a saída de cada tubo; as junções mostram o seu próprio valor.</li>
</ul>
<p>Uma legenda mostra a escala. A velocidade usa uma escala fixa para água, explicada em [[go:results.velocity|Escala de velocidade]]; as outras grandezas vão do mínimo ao máximo do modelo.</p>
<p>Também funciona nas vistas 3D. É preciso ter resultados: complete a lista de verificação.</p>`,
          },
          tables: {
            title: 'Aba Resultados',
            body: `<p>A aba [[t:app.tabs.out]] tem seis partes:</p>
<ul>
<li>[[t:results.tabs.general]]: situação do cálculo, iterações, fluido e ambiente; [[t:results.boundaries.title]], com o que entra e sai da rede em cada contorno; e os avisos.</li>
<li>[[t:results.tabs.pipes]]: diâmetro nominal, schedule, cotas, vazão, velocidade, pressões de estagnação na entrada e na saída e K dos acessórios.</li>
<li>[[t:results.tabs.junctions]]: pressões de estagnação e estáticas, ΔP0, K efetivo, vazão através, HGL e cota.</li>
<li>[[t:results.tabs.pumps]]: vazão, altura, ΔP, velocidade, eficiência, potências e NPSH.</li>
<li>[[t:results.tabs.valves]]: estado, vazão, ΔP0, pressão estática na entrada, Cv e K efetivos.</li>
<li>[[t:results.tabs.warnings]]: a lista completa de avisos.</li>
</ul>
<p>Clique numa linha, ou num aviso, para localizar o objeto no desenho. Cada coluna numérica escolhe a própria unidade no cabeçalho.</p>
<h4>Levar para o Excel</h4>
<p>Em [[t:results.tabs.pipes]], [[t:results.exportExcel]] gera um arquivo .xlsx com cabeçalho formatado, números como valores e filtro; [[t:results.copyExcel]] copia a tabela para colar numa planilha. As outras tabelas têm o botão [[t:results.copyTable]].</p>`,
          },
          warnings: {
            title: 'Avisos',
            body: `<p>Os avisos têm três níveis: [[t:results.level.critical]] (o resultado provavelmente não representa a realidade), [[t:results.level.warning]] (algo merece atenção) e [[t:results.level.caution]] (uma observação). Os mais comuns:</p>
<table>
<tr><th>Aviso</th><th>O que fazer</th></tr>
<tr><td>A solução não convergiu</td><td>Revise os dados e veja [[go:system.solution|Controle da solução]].</td></tr>
<tr><td>Pressão estática abaixo da pressão de vapor</td><td>Risco de cavitação ou de separação da coluna: aumente a pressão (cotas, bomba) ou reduza as perdas.</td></tr>
<tr><td>NPSH disponível menor que o requerido</td><td>A bomba vai cavitar: aumente a pressão na sucção ou reduza as perdas antes dela.</td></tr>
<tr><td>Bomba além do fim da curva, ou refluxo na bomba</td><td>O ponto de operação saiu da curva informada: estenda a curva ou revise o sistema.</td></tr>
<tr><td>Válvula de controle adicionando pressão, ou sem controle</td><td>O ajuste não é alcançável com a pressão disponível: revise o ajuste ou o sistema.</td></tr>
<tr><td>Fluxo contra o sentido de referência</td><td>Confira se o componente está ligado no sentido certo.</td></tr>
<tr><td>Massa desbalanceada numa junção</td><td>A continuidade não fechou: reduza a tolerância.</td></tr>
<tr><td>Trecho sem referência de pressão</td><td>Ligue um reservatório, uma pressão imposta ou um bocal a esse trecho.</td></tr>
</table>
<p>O número na aba [[t:app.tabs.out]] conta os avisos e fica vermelho quando há algum crítico. Clique num aviso para localizar o objeto.</p>`,
          },
          velocity: {
            title: 'Escala de velocidade',
            body: `<p>Em [[t:network.overlay.V]], a cor segue uma escala fixa para água — e não o mínimo e o máximo do modelo —, para que a mesma cor signifique a mesma faixa em qualquer rede:</p>
<table>
<tr><th>Velocidade (m/s)</th><th>Faixa</th></tr>
<tr><td>abaixo de 0,6</td><td>[[t:core.data.velocity.belowMin]]: risco de sedimentação</td></tr>
<tr><td>0,6 a 1,0</td><td>[[t:core.data.velocity.low]]: o tubo talvez esteja superdimensionado</td></tr>
<tr><td>1,0 a 2,5</td><td>[[t:core.data.velocity.economic]]</td></tr>
<tr><td>2,5 a 3,0</td><td>[[t:core.data.velocity.high]]</td></tr>
<tr><td>3,0 a 5,0</td><td>[[t:core.data.velocity.veryHigh]]</td></tr>
<tr><td>acima de 5,0</td><td>fora da escala (preto)</td></tr>
</table>
<p>São referências de projeto, não limites de norma: a velocidade econômica de cada instalação depende do custo da energia, das horas de operação e do material. O cartão de dados e o painel do tubo mostram a faixa ao lado da velocidade.</p>`,
          },
          inputs: {
            title: 'Dados do modelo',
            body: `<p>A aba [[t:app.tabs.data]] lista as entradas do cenário atual: uma tabela de tubos (ligação, comprimento, material, seção, atrito, acessórios, paralelos e condição) e uma de junções (tipo, cota e dados principais).</p>
<ul>
<li>As células destacadas diferem do cenário pai.</li>
<li>Objetos incompletos aparecem como indefinidos.</li>
<li>Clique numa linha para selecionar o objeto e editá-lo na aba [[t:app.tabs.net]].</li>
</ul>`,
          },
        },
      },

      charts: {
        title: 'Gráficos',
        sections: {
          pump: {
            title: 'Bomba × sistema',
            body: `<p>Escolha a bomba na lista. O gráfico mostra:</p>
<ul>
<li>a <b>curva da bomba</b> na velocidade atual, já com as bombas em paralelo, se houver;</li>
<li>a <b>curva do sistema</b>: a altura que o restante da rede exige para cada vazão. Ela é obtida rodando o solver várias vezes com vazão fixa na bomba, com o resto do modelo como está no cenário atual;</li>
<li>o <b>ponto de operação</b>, quando o modelo está calculado.</li>
</ul>
<p>As unidades de vazão e de altura são escolhidas nas listas acima do gráfico. No modo [[t:junctions.pump.form.modes.fixedFlow]] só aparece a curva do sistema — útil para escolher uma bomba.</p>`,
          },
          profile: {
            title: 'Perfil',
            body: `<p>O perfil mostra como as grandezas variam ao longo de um caminho de tubos:</p>
<ol class="steps">
<li>Escolha as junções [[t:charts.profile.from]] e [[t:charts.profile.to]]. O caminho é o que tem menos tubos entre elas, em qualquer sentido.</li>
<li>Escolha a [[t:charts.profile.quantity]]: [[t:charts.profile.heads]] (HGL, EGL e a cota do tubo) ou [[t:charts.profile.pressures]] (com a pressão de vapor como referência).</li>
</ol>
<p>Degraus verticais são junções com perda ou ganho, como bombas e válvulas. HGL e EGL usam pressão absoluta.</p>`,
          },
        },
      },

      views3d: {
        title: 'Vistas 3D',
        sections: {
          concept: {
            title: 'Esquema, isométrica e 3D',
            body: `<p>No alto da área de desenho, [[show:views|Esquema · Isométrica · 3D]] (teclas <kbd>1</kbd>, <kbd>2</kbd> e <kbd>3</kbd>) alterna entre três vistas do <b>mesmo modelo</b>:</p>
<ul>
<li>o esquema é a <b>planta</b>: a posição de cada junção no esquema é a sua posição no plano;</li>
<li>a <b>altura</b> de cada junção é a sua elevação, multiplicada pela [[t:inspector.view3.zScale]];</li>
<li>mover uma junção numa vista move nas outras, e subir ou descer uma junção numa vista 3D <b>muda a elevação</b> e recalcula;</li>
<li>traçados, dobras e posições no plano são só desenho: <b>nenhum comprimento vem do desenho</b>.</li>
</ul>
<p>Na primeira entrada, o app escolhe uma escala vertical que deixa as alturas legíveis. Os tubos aparecem como tubos com sombreado e espessura pelo diâmetro, os mais próximos por cima dos de trás, e as junções como pequenos objetos 3D.</p>`,
          },
          iso: {
            title: 'Isométrica',
            body: `<h4>Navegar</h4>
<p>Arraste o fundo para mover a vista e use a roda para aproximar. Os botões de girar viram a vista em 90°. [[t:network.view3.grid]], [[t:network.view3.shadows]], o estilo ([[t:network.view3.styleTrue]] ou 2:1) e a densidade da grade ficam nos controles.</p>
<h4>Editar</h4>
<ul>
<li><b>Colocar</b>: com um tipo da paleta, clique na grade. A junção fica na [[t:network.view3.level]] de trabalho, que <kbd>PageUp</kbd> e <kbd>PageDown</kbd> sobem e descem.</li>
<li><b>Tubos</b>: com a ferramenta [[t:network.palette.pipe]], clique numa junção ou na grade, mova o cursor e escolha o traçado com <kbd>←</kbd> e <kbd>→</kbd>; <kbd>Alt</kbd>+clique ou <kbd>D</kbd> faz uma dobra; perto de uma junção, o traçado vai até ela.</li>
<li><b>Mover</b>: arraste uma junção ao longo de um eixo (na vertical, muda a elevação). Arraste a alça no meio de um trecho do tubo selecionado para mover aquele trecho.</li>
</ul>`,
          },
          free: {
            title: '3D livre',
            body: `<h4>Navegar</h4>
<p>Arraste o fundo para girar; o botão direito, o botão do meio ou <kbd>Shift</kbd>+arrastar movem a vista; a roda aproxima no ponto do cursor; o duplo clique centraliza num objeto. As setas giram a câmera em 15°, e <kbd>Shift</kbd>+setas movem a vista. Nos controles ficam [[t:network.view3.persp]] ou [[t:network.view3.ortho]], as vistas prontas ([[t:network.view3.presets.top]], [[t:network.view3.presets.front]], [[t:network.view3.presets.side]] e [[t:network.view3.presets.iso]]), [[t:network.view3.grid]], [[t:network.view3.snap]], [[t:network.view3.shadows]] e [[t:network.view3.stems]].</p>
<h4>Editar</h4>
<ul>
<li><b>Tubos</b>: o tubo segue na horizontal, no plano do último ponto; segure <kbd>Shift</kbd> para subir ou descer e <kbd>Ctrl</kbd> para travar no eixo mais próximo; <kbd>Alt</kbd>+clique ou <kbd>D</kbd> faz uma dobra; um clique no vazio termina o tubo num nó novo.</li>
<li><b>Mover</b>: arraste uma junção na horizontal; com <kbd>Shift</kbd>, na vertical (muda a elevação).</li>
<li><b>Dobras</b>: com um tubo selecionado, arraste uma dobra, dê um duplo clique no tubo para inserir outra, ou marque uma e pressione <kbd>Del</kbd>.</li>
</ul>
<p>Nas vistas [[t:network.view3.presets.front]] e [[t:network.view3.presets.side]], o piso fica de perfil; por isso colocar, desenhar e mover usam o plano vertical de frente para a câmera.</p>`,
          },
          symbols: {
            title: 'Símbolos e painel 3D',
            body: `<p>Nas vistas 3D, cada junção é um pequeno sólido: um tanque aberto com o líquido, uma bomba com motor e uma seta no sentido do escoamento, uma válvula com volante, uma válvula de controle com atuador, um orifício entre flanges, um bocal com gotas, uma esfera para o nó, um tambor (Q), uma esfera (P) e um bloco (K). Eles acompanham a direção dos tubos e ficam vermelhos quando a junção bloqueia o fluxo, como uma válvula fechada ou uma bomba desligada e fechada.</p>
<p>Com as vistas 3D abertas, o painel ganha a seção [[t:inspector.view3.title]]:</p>
<ul>
<li>com nada selecionado: [[t:inspector.view3.zScale]], [[t:inspector.view3.autoScale]] e [[t:inspector.view3.fitAll]];</li>
<li>num tubo: o comprimento desenhado (que não entra no cálculo), as dobras, [[t:inspector.view3.snap]], [[t:inspector.view3.fit]], [[t:inspector.view3.nextRoute]] e [[t:inspector.view3.removeBends]];</li>
<li>numa junção: X e Y na planta e, nos tipos orientados, [[t:inspector.view3.roll]], que gira o símbolo em volta do tubo, e [[t:inspector.view3.auto]].</li>
</ul>
<p>Todas as teclas estão em [[act:shortcuts|Atalhos de teclado]].</p>`,
          },
        },
      },

      files: {
        title: 'Arquivos e idioma',
        sections: {
          files: {
            title: 'Arquivos',
            body: `<table>
<tr><th>Comando em [[t:app.menu.file]]</th><th>O que faz</th></tr>
<tr><td>[[t:app.menu.new]]</td><td>Começa um modelo vazio (dá para desfazer).</td></tr>
<tr><td>[[t:app.menu.open]]</td><td>Abre um modelo salvo em .json.</td></tr>
<tr><td>[[t:app.menu.save]]</td><td>Baixa o modelo como <code>título.pumpit.json</code>, com todos os cenários e o desenho.</td></tr>
<tr><td>[[t:app.menu.copyJson]] e [[t:app.menu.pasteJson]]</td><td>Copia o modelo como texto, ou abre um modelo colado como texto — útil para mandar por mensagem.</td></tr>
<tr><td>[[t:app.menu.exportXlsx]]</td><td>Gera a planilha com a tabela de resultados dos tubos.</td></tr>
<tr><td>[[t:app.menu.examples]]</td><td>Abre os modelos de exemplo.</td></tr>
</table>
<p>O modelo também é salvo automaticamente no navegador a cada alteração. Modelos de versões antigas são convertidos ao abrir: tipos de junção removidos viram o equivalente mais próximo, e uma mensagem informa o que mudou.</p>`,
          },
          language: {
            title: 'Idioma e números',
            body: `<p>O seletor no canto superior direito troca a interface inteira entre <b>Português</b>, <b>English</b> e <b>Español</b>, sem recarregar a página: menus, painéis, tabelas, gráficos, avisos e esta ajuda. A escolha fica guardada, e na primeira visita o app segue o idioma do navegador.</p>
<ul>
<li>Os números seguem o idioma (vírgula ou ponto decimal); ao digitar, os dois servem.</li>
<li>Os nomes digitados por você — título, objetos, cenários — nunca são traduzidos.</li>
<li>Um exemplo ainda não alterado é refeito no novo idioma.</li>
</ul>`,
          },
          shortcuts: {
            title: 'Atalhos de teclado',
            body: `<p>Os principais atalhos, que valem fora dos campos de texto:</p>
<table>
<tr><td><kbd>F1</kbd></td><td>Abre esta ajuda</td></tr>
<tr><td><kbd>V</kbd> · <kbd>P</kbd></td><td>Ferramentas [[t:network.palette.select]] e [[t:network.palette.pipe]]</td></tr>
<tr><td><kbd>1</kbd> · <kbd>2</kbd> · <kbd>3</kbd></td><td>Vistas [[t:network.view3.mode.2d]], [[t:network.view3.mode.iso]] e [[t:network.view3.mode.3d]]</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Solta o tubo em andamento e depois sai da ferramenta</td></tr>
<tr><td><kbd>Del</kbd></td><td>Exclui a seleção</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> · <kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Desfaz · refaz</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>C</kbd> · <kbd>Ctrl</kbd>+<kbd>V</kbd> · <kbd>Ctrl</kbd>+<kbd>A</kbd></td><td>Copia · cola · seleciona tudo</td></tr>
<tr><td><kbd>Home</kbd> · <kbd>+</kbd> · <kbd>−</kbd></td><td>Enquadra · aproxima · afasta</td></tr>
</table>
<p>A lista completa, com as teclas das vistas 3D: [[act:shortcuts|Atalhos de teclado]].</p>`,
          },
        },
      },

      tech: {
        title: 'Referência técnica',
        sections: {
          overview: {
            title: 'Hipóteses e grandezas',
            body: `<p>O Pump It resolve o escoamento em <b>regime permanente</b> de um <b>líquido incompressível</b> numa rede de tubos e componentes (para gases, o modo compressível tem a sua [[go:gasTech.properties|referência técnica]]), com estas hipóteses:</p>
<ul>
<li>propriedades do fluido constantes, avaliadas numa única temperatura, sem troca de calor;</li>
<li>escoamento unidimensional e plenamente desenvolvido em cada tubo, com perdas por Darcy-Weisbach (ou Hazen-Williams);</li>
<li>componentes concentrados nas junções, com perdas localizadas ou com características próprias (curva de bomba, controle);</li>
<li>sem transientes (golpe de aríete), compressibilidade ou escoamento bifásico — a pressão abaixo da de vapor apenas gera um aviso.</li>
</ul>
<h4>Grandezas</h4>
<p>Internamente tudo está no SI, e as pressões são <b>absolutas</b>. A variável de pressão nos nós é a <b>pressão de estagnação</b> (total), onde <i>p</i> é a pressão estática:</p>
[[eq:stagnation]]
<p>As cargas são calculadas com a pressão absoluta:</p>
[[eq:heads]]
<p>A cota <i>z</i> de cada ponto é a cota da junção, ou a cota de conexão informada. As vazões são vazões em massa <i>ṁ</i>; a vazão volumétrica é <i>Q</i> = <i>ṁ</i>/<i>ρ</i>.</p>`,
          },
          network: {
            title: 'Modelo da rede',
            body: `<p>O modelo vira um grafo de <b>nós</b> e <b>ligações</b>:</p>
<ul>
<li>As junções de um nó só (reservatório, pressão imposta, vazão imposta, bocal, nó, válvula de saída) são um nó. O bocal e a válvula de saída ganham ainda um nó externo, de pressão fixa, e uma ligação de descarga até ele.</li>
<li>Os componentes de duas portas (bomba, válvulas, orifício, componente genérico) viram um nó de entrada, um nó de saída e uma ligação entre eles.</li>
<li>Cada tubo é uma ligação entre os nós das suas pontas.</li>
</ul>
<p>As incógnitas são a vazão em massa de cada ligação e a pressão de estagnação de cada nó.</p>
<h4>Equações dos nós</h4>
<p>Num nó livre vale a continuidade, em que ṁ<sub>dem</sub> é a demanda do nó (uma vazão imposta ou a fonte de um nó, com sinal):</p>
[[eq:continuity]]
<p>Num nó de pressão fixa (reservatório, pressão imposta, nó externo), a pressão é conhecida — de estagnação, ou a estática do tubo ligado:</p>
[[eq:fixedNode]]
<h4>Equações das ligações</h4>
<p>Numa ligação com perda (tubo, válvula, orifício, bomba, descarga), a energia entre as pontas <i>a</i> e <i>b</i> é:</p>
[[eq:linkLoss]]
<p>Δp(ṁ) é a perda da ligação, com o sinal do escoamento; numa bomba é negativa, um ganho. O termo de gravidade existe nos tubos, que ligam cotas diferentes. Conforme o estado, uma ligação pode ter outra equação: vazão nula (fechada), vazão fixa (bomba de vazão fixa, controle de vazão), pressão estática fixa a jusante ou a montante (controle de pressão) ou diferença de pressão fixa (controle de ΔP).</p>
<h4>Unicidade</h4>
<p>Antes de resolver, o app separa as partes ligadas da rede. Cada parte precisa de uma referência de pressão. Uma parte sem referência e sem vazão forçada fica isolada (vazão zero, pressão indefinida); com vazão forçada e sem referência, o cálculo é recusado.</p>`,
          },
          newton: {
            title: 'Método de solução',
            body: `<p>O sistema é resolvido pelo <b>método de Newton-Raphson</b> sobre todas as incógnitas ao mesmo tempo — o mesmo sistema do método do gradiente de Todini e Pilati (1988), que estende a formulação de Jeppson (1976) a redes com componentes:</p>
[[eq:newtonStep]]
<p><i>R</i> é o vetor de resíduos das equações dos nós e das ligações, e <i>J</i> é a matriz jacobiana. As derivadas das perdas são numéricas, por diferenças centrais, com um valor mínimo que evita uma jacobiana singular em vazão nula:</p>
[[eq:jacobian]]
<p>O sistema linear é resolvido por eliminação de Gauss, com equilíbrio das linhas e pivotamento parcial.</p>
<h4>Chute inicial</h4>
<p>1 m/s em todos os tubos, no sentido de referência, e, nos nós, a média das pressões fixas. Quando um dispositivo muda de estado, a solução anterior vira o novo chute.</p>
<h4>Relaxação e busca linear</h4>
<p>O passo aplicado é α·Δx, com α igual à relaxação. Com a relaxação adaptativa, α cai pela metade (até 10 vezes) enquanto a norma dos resíduos escalonados não diminuir o bastante; perto da solução, o passo inteiro é sempre aceito:</p>
[[eq:lineSearch]]
<h4>Convergência</h4>
<p>O critério usa o passo de Newton completo, e não o relaxado, para não confundir passo pequeno com convergência:</p>
[[eq:convergence]]
<p>ε<sub>i</sub> é um piso absoluto para vazões e pressões próximas de zero. O critério precisa ser cumprido em duas iterações seguidas.</p>
<h4>Dispositivos com estado</h4>
<p>As válvulas de controle têm estados (controlando, totalmente aberta, fechada). Depois de cada convergência, o app revê os estados; se algum mudou, resolve de novo, até 50 passagens. Se os estados entrarem em ciclo, o cálculo para com um aviso de solução única impossível.</p>
<h4>Verificação de massa</h4>
<p>Com a checagem ligada, a conservação de massa é conferida em cada nó livre: um desequilíbrio maior que a tolerância relativa vezes a vazão do nó gera um aviso.</p>`,
          },
          friction: {
            title: 'Atrito nos tubos',
            body: `<p>A velocidade média e o número de Reynolds de cada tubo (N tubos iguais em paralelo dividem a vazão):</p>
[[eq:velocity]]
<p>A perda distribuída segue Darcy-Weisbach:</p>
[[eq:darcy]]
<h4>Fator de atrito</h4>
<p><b>Laminar</b> (<i>Re</i> &lt; Re<sub>lam</sub>, 2300 por padrão): Hagen-Poiseuille.</p>
[[eq:laminar]]
<p><b>Turbulento</b> (<i>Re</i> &gt; Re<sub>turb</sub>, 4000 por padrão): a equação de Colebrook na forma original (constantes 1,14 e 9,35), resolvida por iteração até a precisão de 10⁻¹³:</p>
[[eq:colebrook]]
<p><b>Transição</b>: interpolação linear em <i>Re</i> entre o valor laminar em Re<sub>lam</sub> e o de Colebrook em Re<sub>turb</sub>:</p>
[[eq:transition]]
<p>O modelo hidraulicamente liso usa ε = 0; o fator informado vale em todos os regimes; sem atrito, Δp<sub>f</sub> = 0.</p>
<h4>Hazen-Williams</h4>
<p>Não depende da viscosidade nem do regime. O coeficiente <i>k</i> foi calibrado contra resultados de referência (o clássico 0,8492 dá uma perda cerca de 0,1% menor):</p>
[[eq:hazen]]
<h4>Seções não circulares</h4>
<p>Todas as fórmulas usam o diâmetro hidráulico — para a seção circular, o anel, o retângulo de lados <i>a</i> e <i>b</i> ou a área e o perímetro informados:</p>
[[eq:hydraulicDiameter]]
<p>A incrustação reduz o diâmetro hidráulico e a área (<i>r</i> é a redução em fração):</p>
[[eq:fouling]]`,
          },
          minor: {
            title: 'Perdas localizadas',
            body: `<p>Toda perda localizada usa um coeficiente K sobre a pressão dinâmica:</p>
[[eq:minor]]
<ul>
<li><b>Acessórios do tubo</b>: os K se somam e usam a velocidade do próprio tubo. Os itens do Crane TP-410 são dados por K/f<sub>T</sub>, com o f<sub>T</sub> do aço comercial limpo, totalmente turbulento, no diâmetro interno real:</li>
</ul>
[[eq:fittingsSum]]
[[eq:craneFT]]
<ul>
<li><b>Perdas nas pontas</b> (tabela de perdas por tubo): o K de saída da junção ou de chegada a ela, cada um com a velocidade do próprio tubo e só no sentido correspondente.</li>
<li><b>Componentes de duas portas</b>: o K se refere ao tubo de montante, conforme o sentido do escoamento.</li>
</ul>
<h4>Correção laminar dos K</h4>
<p>Os K de catálogo valem para escoamento turbulento. Abaixo de Re<sub>turb</sub>, a correção (por padrão, [[t:inspector.system.improvedAtkf]]) aumenta o K na proporção do fator de atrito laminar:</p>
[[eq:atkf]]
[[eq:atkfTransition]]
<p>f<sub>ref</sub> é o f<sub>T</sub> do Crane no diâmetro do tubo (ATKF aprimorado) ou o fator de atrito totalmente turbulento do próprio tubo, pela rugosidade dele (ATKF). A interpolação mantém a perda contínua em Re<sub>lam</sub> e em Re<sub>turb</sub>. Com a opção [[t:inspector.system.noCorrection]], o K é usado como foi informado.</p>`,
          },
          pumps: {
            title: 'Bombas',
            body: `<h4>Curva</h4>
<p>Os pontos informados são ajustados por mínimos quadrados (polinômio de ordem 0 a 4) ou ligados por interpolação linear, com extrapolação linear nas pontas. O cálculo sempre usa a curva ajustada:</p>
[[eq:polyfit]]
<p>A curva informada vale para 100% da rotação e para uma bomba. Para a velocidade relativa <i>s</i> e N bombas iguais em paralelo, valem as leis de afinidade:</p>
[[eq:pumpCurve]]
<p>Na rede, a bomba é uma ligação cuja "perda" é o ganho de carga, com sinal negativo:</p>
[[eq:pumpLink]]
<h4>Modos</h4>
<p>Na vazão fixa, a equação da ligação passa a ser ṁ = valor, e a altura necessária sai do cálculo. No controle de vazão é igual, com a vazão de ajuste; nos controles de pressão, a pressão estática na descarga (ou na sucção) é fixada. Nos modos de controle, a velocidade necessária é achada por bisseção:</p>
[[eq:pumpSpeed]]
<h4>Potência e NPSH</h4>
[[eq:pumpPower]]
<p>A eficiência η vem da curva de eficiência, lida na vazão equivalente por bomba a 100% (Q/(N·s)); sem ela, η = 1. O NPSH disponível usa a pressão de estagnação absoluta na sucção:</p>
[[eq:npsh]]
<h4>Curva do sistema</h4>
<p>O gráfico Bomba × sistema roda o solver com a bomba em vazão fixa, de zero a 125% da vazão máxima da curva (escalada pela velocidade e pelo número de bombas), e registra a altura exigida em cada ponto.</p>`,
          },
          valves: {
            title: 'Válvulas, orifícios e bocais',
            body: `<h4>Válvula</h4>
<p>Com K, a perda usa a velocidade no tubo de montante:</p>
[[eq:valveK]]
<p>Com Cv (EUA, densidade relativa à água a 60 °F, 999,0 kg/m³) ou Kv (métrico, relativo a 1000 kg/m³):</p>
[[eq:cv]]
<p>Os resultados trazem o Cv equivalente à vazão e à queda calculadas:</p>
[[eq:cvEquivalent]]
<h4>Válvula de controle</h4>
<p>Controlando, a ligação deixa de ter perda e passa a impor a pressão a jusante (PRV) ou a montante (PSV), estática ou de estagnação, a vazão (FCV) ou a queda de pressão (PDCV). Totalmente aberta, vale a perda com o K de válvula aberta; fechada, ṁ = 0. Depois de cada convergência, os estados são revistos:</p>
<ul>
<li>uma PRV ou PSV controlando passa a <b>fechada</b> se a vazão ficar negativa, e a <b>totalmente aberta</b> se a queda exigida for menor que a perda com a válvula aberta (exceto com [[t:junctions.control.form.alwaysControl]]);</li>
<li>totalmente aberta, ela volta a controlar quando a pressão a jusante passa do ajuste (PRV), quando a de montante fica abaixo dele (PSV) ou quando a vazão passa do ajuste (FCV);</li>
<li>uma FCV que não consegue controlar segue a escolha [[t:junctions.control.form.failAction]].</li>
</ul>
<h4>Válvula de saída</h4>
[[eq:exitValve]]
<p>A perda da válvula usa K (sobre a velocidade do tubo), Cv ou Kv.</p>
<h4>Orifício</h4>
<p>Pelas correlações de Idelchik, com A<sub>1</sub> a área de montante, A<sub>2</sub> a de jusante e A<sub>o</sub> a do orifício. Canto vivo:</p>
[[eq:orificeSharp]]
<p>Borda arredondada, de raio <i>r</i>, entre tubos de mesma área (com áreas diferentes, a fórmula ganha os termos de expansão):</p>
[[eq:orificeRounded]]
<p>Por coeficiente de descarga, já referido ao tubo de montante:</p>
[[eq:orificeCd]]
<h4>Bocal / aspersor</h4>
[[eq:spray]]
[[eq:sprayArea]]
<p>O fator K de catálogo pressupõe água; para outro fluido, informe Cd e a área.</p>
<h4>Componente genérico</h4>
<p>Com K, funciona como a válvula. Com curva, a queda vem da curva ajustada aos pontos ΔP × vazão:</p>
[[eq:genericCurve]]`,
          },
          boundaries: {
            title: 'Contornos',
            body: `<ul>
<li><b>Reservatório</b>: um nó de pressão fixa igual à pressão na superfície, na cota do nível do líquido. Cada tubo se liga na cota do fundo ou na sua cota de conexão; se essa cota estiver acima do nível, o tubo descarrega em queda livre, e a pressão de contorno vale na ponta do tubo.</li>
<li><b>Pressão imposta</b>: um nó de pressão de estagnação fixa; no tipo estático, fixa-se p = P<sub>0</sub> − ½ρV² do tubo único.</li>
<li><b>Vazão imposta</b> e <b>fonte de um nó</b>: entram na continuidade como demanda (positiva sai, negativa entra).</li>
<li><b>Bocal</b> e <b>válvula de saída</b>: um nó externo de pressão fixa (a externa ou a residual), ligado por uma ligação de descarga.</li>
</ul>
<p>A vazão líquida de cada contorno aparece em [[t:app.tabs.out]] → [[t:results.tabs.general]] → [[t:results.boundaries.title]], positiva quando entra na rede.</p>`,
          },
          fluid: {
            title: 'Propriedades da água',
            body: `<p>Para a água, as propriedades vêm de correlações públicas, válidas de 0 a 150 °C (fora disso, aparece um aviso). Densidade, por Kell (1975), com <i>t</i> em °C e ρ em kg/m³:</p>
[[eq:kell]]
<p>Viscosidade dinâmica, pela equação de Vogel, com <i>T</i> em K:</p>
[[eq:vogel]]
<p>Pressão de vapor, pela equação de saturação da IAPWS-IF97, região 4, com <i>T</i> em K, n<sub>1</sub>…n<sub>10</sub> os coeficientes da norma, A = θ² + n<sub>1</sub>θ + n<sub>2</sub>, B = n<sub>3</sub>θ² + n<sub>4</sub>θ + n<sub>5</sub> e C = n<sub>6</sub>θ² + n<sub>7</sub>θ + n<sub>8</sub>:</p>
[[eq:iapws]]
<p>Com fluido definido pelo usuário, ρ, μ e Pv são os informados. A pressão de vapor só entra nos avisos (pressão estática abaixo dela num tubo) e no NPSH disponível.</p>`,
          },
          outputs: {
            title: 'Resultados derivados',
            body: `<ul>
<li><b>Pressões nos tubos</b>: P<sub>0</sub> na entrada e na saída já descontam as perdas de ponta; a pressão estática é P<sub>0</sub> − ½ρV².</li>
<li><b>Perda de carga</b> h<sub>L</sub>: as perdas por atrito, acessórios e pontas, em altura.</li>
<li><b>Queda de pressão total</b>: ΔP<sub>0</sub> = P<sub>0</sub> na entrada − P<sub>0</sub> na saída, incluindo a gravidade.</li>
<li><b>Regime</b>: laminar abaixo de Re<sub>lam</sub>, turbulento acima de Re<sub>turb</sub> e transição entre eles.</li>
<li><b>K efetivo</b> de um componente de duas portas: a queda de estagnação dividida pela pressão dinâmica na entrada.</li>
</ul>
[[eq:effectiveK]]
<ul>
<li><b>Bombas</b>: ΔH, potências, eficiência e NPSH, como em [[go:tech.pumps|Bombas]].</li>
<li><b>K na tabela de tubos</b>: a soma dos K dos acessórios, sobre a área do tubo, sem a correção laminar.</li>
</ul>
<p>Também saem avisos de cavitação (pressão estática abaixo da de vapor), de tubo mais curto que o desnível que vence, de tubo acima do nível tomando líquido de um reservatório e de fluxo contra o sentido de referência num componente, além dos avisos de bombas, válvulas e convergência.</p>`,
          },
          references: {
            title: 'Validação e referências',
            body: `<h4>Validação</h4>
<p>Testes automáticos conferem o cálculo contra soluções independentes: tubo único (Colebrook resolvido analiticamente), Hazen-Williams, ponto de operação de bomba por bisseção (também a 80% da rotação), curva do sistema, três reservatórios e rede malhada (continuidade e energia), válvula redutora mantendo o ajuste e abrindo no pico, controle de vazão, válvula de saída com solução analítica, bomba de vazão fixa, aspersores e todos os exemplos. Comparados com resultados de referência de casos de verificação, os desvios máximos foram de 5·10⁻⁵ em Darcy-Weisbach e 2,5·10⁻⁵ em Hazen-Williams.</p>
<h4>Fora do escopo</h4>
<p>Transientes (golpe de aríete), troca de calor, fluidos não newtonianos, escoamento bifásico e custos.</p>
<h4>Referências</h4>
<ul>
<li>Todini, E.; Pilati, S. (1988). A gradient algorithm for the analysis of pipe networks.</li>
<li>Jeppson, R. W. (1976). <i>Analysis of Flow in Pipe Networks</i>.</li>
<li>Colebrook, C. F. (1939). Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws.</li>
<li>Moody, L. F. (1944). Friction factors for pipe flow.</li>
<li>White, F. M. <i>Fluid Mechanics</i>, tabela 6.1 (rugosidades típicas).</li>
<li>Crane Co. <i>Flow of Fluids Through Valves, Fittings and Pipe</i>, Technical Paper 410 (método K/f<sub>T</sub>).</li>
<li>Idelchik, I. E. <i>Handbook of Hydraulic Resistance</i> (orifícios).</li>
<li>Kell, G. S. (1975). Density, thermal expansivity and compressibility of liquid water from 0 to 150 °C.</li>
<li>Vogel, H. (1921). Equação de temperatura da viscosidade de líquidos.</li>
<li>IAPWS-IF97, região 4 (pressão de saturação da água).</li>
<li>ASME B36.10M (dimensões de tubos de aço).</li>
</ul>`,
          },
        },
      },

      gas: {
        title: 'Gás (modo compressível)',
        sections: {
          concept: {
            title: 'O modo compressível',
            body: `<p>O Pump It calcula redes de <b>líquido</b> e de <b>gás</b>. A escolha é o <b>regime</b> do modelo, no topo da janela [[t:inspector.system.title]]: [[t:inspector.system.regimes.incompressible]] ou [[t:inspector.system.regimes.compressible]]. O selo ao lado do título do modelo [[show:stamp|mostra sempre o regime em uso]]; um clique nele abre essa janela.</p>
<h4>Quando o gás é compressível</h4>
<p>No modo compressível a densidade muda com a pressão e a temperatura ao longo de cada tubo, o gás acelera enquanto se expande e pode chegar à velocidade do som. Use-o quando:</p>
<ul>
<li>o número de Mach passa de 0,3 em algum tubo; ou</li>
<li>a queda de pressão passa de 10% da pressão absoluta de entrada, mesmo com Mach baixo.</li>
</ul>
<p>Abaixo disso, o modo incompressível com a densidade do gás erra pouco. O app ajuda nos dois sentidos: no modo incompressível, um fluido leve como um gás que passa desses limites gera um aviso que sugere o compressível; no compressível, quando tudo fica abaixo de Mach 0,1 e de 2% de queda, uma informação lembra que o incompressível daria praticamente o mesmo.</p>
<h4>Nada se perde ao trocar</h4>
<p>Cada regime guarda o seu fluido: o líquido de um lado, o gás do outro. Trocar de regime recalcula na hora, sem apagar dados. Dá para comparar os dois, inclusive com um [[go:scenarios.concept|cenário]] que mude só o regime ou o modelo térmico. O desenho, as junções, os tubos e as vistas são os mesmos.</p>
<p class="tip">Para começar, abra [[act:example:air]], uma linha de ar comprimido com queda de pressão de cerca de 50%, ou [[act:example:airPlant]], com compressor, válvula redutora e bico de limpeza.</p>`,
          },
          setup: {
            title: 'Gás, temperatura e modelo térmico',
            body: `<p>No regime compressível, a janela do sistema mostra a seção [[t:inspector.system.gas]]:</p>
<ul>
<li>[[t:inspector.system.gasMode]]: <b>[[t:inspector.system.gasModes.isothermal]]</b> mantém a temperatura constante em toda a rede (linhas longas que trocam calor com o ambiente); <b>[[t:inspector.system.gasModes.adiabatic]]</b> não troca calor: a temperatura de estagnação se conserva em cada tubo e o gás esfria ao acelerar (linhas curtas ou isoladas).</li>
<li>[[t:inspector.system.gasKind]]: ar, nitrogênio, oxigênio, metano, gás natural (aproximado), CO₂ e hidrogênio, com massa molar e k de valores públicos e viscosidade pela lei de Sutherland; ou [[t:inspector.system.customGas]], com massa molar, k e viscosidade informados. Ao passar de um gás da biblioteca para o personalizado, os valores dele viram o ponto de partida.</li>
<li>[[t:inspector.system.Z]]: 1 para gás ideal; para um gás real, o valor nas condições de operação, constante no modelo.</li>
<li>Temperatura: no isotérmico, a do gás em toda a rede; no adiabático, a temperatura de estagnação das fontes. Cada fonte pode ter a sua, como em [[go:gas.components]].</li>
</ul>
<p>Logo abaixo aparecem a constante do gás R, a velocidade do som na temperatura dada e a densidade normal.</p>
<h4>Limites de projeto</h4>
<p>[[t:inspector.system.machLimit]] (padrão 0,7) e [[t:inspector.system.velLimit]] (padrão 30 m/s) geram avisos quando um tubo os passa. O bloqueio sônico é sempre avisado.</p>
<h4>Pressões e vazões</h4>
<p>As pressões do gás são calculadas em valor <b>absoluto</b>; as unidades manométricas somam a [[t:inspector.system.patm]]. As vazões podem ser informadas em massa (kg/s, kg/h, t/h…), em volume nas condições do ponto (m³/h, L/s…) ou em volume <b>normal</b> (Nm³/h, a 0 °C e 101,325 kPa).</p>`,
          },
          components: {
            title: 'Contornos e componentes com gás',
            body: `<p>As junções são as mesmas do modo incompressível. Com gás:</p>
<ul>
<li>[[icon:reservoir]] <b>Reservatório</b>: um vaso de gás em repouso. A pressão informada é de estagnação e vale na cota de referência; a coluna de gás até cada tubo entra no cálculo.</li>
<li>[[icon:pressure]] <b>Pressão imposta</b>: estática ou de estagnação, como você escolher.</li>
<li>[[icon:flow]] <b>Vazão imposta</b> e [[icon:branch]] <b>nó</b>: vazão em massa, em volume nas condições do nó ou em volume normal.</li>
<li>No modelo adiabático, o reservatório, a pressão imposta, a vazão que entra e a fonte de um nó têm o campo [[t:junctions.gasT.label]]; vazio, vale a temperatura das fontes.</li>
<li>[[icon:valve]] <b>Válvula</b>, [[icon:generic]] <b>componente genérico</b> e [[icon:orifice]] <b>orifício</b>: as perdas localizadas valem como comprimento equivalente de atrito. Cv e Kv viram o K equivalente na área do tubo de entrada. O orifício também limita a vazão à vazão crítica do furo: um orifício de restrição bloqueia muito antes do tubo.</li>
<li>[[icon:control]] <b>Válvula de controle</b>: redutora, sustentadora, de vazão e de ΔP, com os mesmos estados do líquido.</li>
<li>[[icon:spray]] <b>Bocal</b>: escoamento isentrópico pela área efetiva, que bloqueia quando a pressão externa cai abaixo da razão crítica (cerca de 0,53 da pressão a montante, no ar).</li>
<li>[[icon:exitvalve]] <b>Válvula de saída</b>: a perda da válvula até a pressão externa, onde a pressão estática do jato é a residual.</li>
<li>[[icon:pump]] <b>Bomba</b>: com gás, é um compressor ou soprador, como em [[go:gas.compressor]].</li>
</ul>
<p>O modelo de Hazen-Williams não vale para gás: tubos com ele são calculados por Darcy, com a rugosidade guardada no tubo, e um aviso lista quais.</p>`,
          },
          compressor: {
            title: 'Compressores e sopradores',
            body: `<p>No modo compressível, a [[icon:pump]] bomba é um compressor ou soprador. Em [[t:junctions.pump.form.mode]]:</p>
<ul>
<li>[[t:junctions.pump.form.modes.ratio]]: a pressão de estagnação de saída é a de entrada vezes a razão.</li>
<li>[[t:junctions.pump.form.modes.curve]]: a curva de altura vale como <b>altura isentrópica</b> do gás contra a vazão volumétrica na sucção, com as leis de afinidade (rotação e máquinas em paralelo). Para alturas pequenas, como num soprador, isso é ΔP = ρgH, a curva de uma bomba.</li>
<li>[[t:junctions.pump.form.modes.fixedFlow]]: a vazão é imposta e o cálculo mostra a razão necessária.</li>
<li>Os modos de rotação variável controlam a vazão, a pressão estática de descarga ou a de sucção, e o app mostra a rotação que a curva pede.</li>
</ul>
<p>A [[t:junctions.pump.form.etaGas]] (ou a curva de eficiência, quando houver) diz quanto o gás esquenta. No modelo adiabático, o gás sai mais quente e leva essa temperatura pela rede; no isotérmico, considera-se que um resfriador o devolve à temperatura da rede, e a temperatura de descarga é só informada. Os resultados trazem a razão, a altura isentrópica, a temperatura de descarga e a potência entregue ao gás. As equações estão em [[go:gasTech.machines]].</p>`,
          },
          results: {
            title: 'Resultados com gás',
            body: `<p>Os resultados de um gás trazem, além do que vale para líquidos:</p>
<ul>
<li><b>Vazão mássica</b>, a mesma ao longo do tubo; a vazão volumétrica na entrada, nas condições locais; e a vazão normal.</li>
<li>Em cada ponta do tubo: velocidade, <b>número de Mach</b>, pressões <b>estática</b> e <b>de estagnação</b>, temperatura e densidade. "Entrada" e "saída" seguem o sentido de referência do tubo.</li>
<li>A marca de <b>bloqueio</b>: o gás chegou à velocidade do som na saída do tubo (Mach 1/√k no isotérmico, 1 no adiabático). A vazão não passa da crítica, por mais que a pressão a jusante caia; o resultado mostra o estado na saída do tubo, antes da expansão até a pressão do nó.</li>
</ul>
<p>Em [[show:overlay|Resultados no desenho]] entram a vazão mássica e o número de Mach; a linha piezométrica, uma altura de líquido, sai. A velocidade do gás é colorida pela faixa do próprio modelo, porque a escala fixa é a da água. O gráfico de perfil traça as pressões estática e de estagnação ponto a ponto dentro de cada tubo, porque a pressão de um gás não cai em linha reta.</p>
<h4>Avisos</h4>
<ul>
<li><b>Crítico</b>: tubo bloqueado; cálculo que não convergiu.</li>
<li><b>Aviso</b>: junção bloqueada (válvula, orifício, bocal); Mach acima do limite de projeto.</li>
<li><b>Cautela</b>: velocidade acima do limite; Hazen-Williams tratado como Darcy.</li>
<li><b>Informação</b>: o modo incompressível daria praticamente o mesmo resultado.</li>
</ul>`,
          },
        },
      },

      gasTech: {
        title: 'Referência técnica do gás',
        sections: {
          properties: {
            title: 'Propriedades do gás',
            body: `<p>O gás é ideal, com fator de compressibilidade <i>Z</i> constante. Com a massa molar MW, a densidade e a constante do gás são:</p>
[[eq:gasLaw]]
<p>A velocidade do som, o fluxo de massa <i>G</i> (vazão mássica por área, constante num tubo de área constante) e o número de Mach:</p>
[[eq:machGas]]
<p>As grandezas de estagnação, as do gás desacelerado até o repouso sem perdas, vêm das relações isentrópicas:</p>
[[eq:stagnationGas]]
<p>Nos gases da biblioteca, a viscosidade segue a lei de Sutherland, com μ₀ e S de valores públicos; ela é avaliada na temperatura do gás e fica constante na rede:</p>
[[eq:sutherland]]
<p>As vazões normais usam a densidade a 0 °C e 101,325 kPa, como gás ideal:</p>
[[eq:normalFlow]]`,
          },
          pipe: {
            title: 'O tubo: forma fechada, Fanno e marcha',
            body: `<p>Num tubo de área constante, em regime permanente, valem a continuidade (ρV = G), o momento e a energia. O fator de atrito <i>f</i> é o de Darcy, pela mesma correlação do líquido, com Re = G·D<sub>h</sub>/μ, constante ao longo do tubo, porque G e μ são.</p>
<h4>Isotérmico: forma fechada</h4>
<p>No tubo horizontal e isotérmico, a integração dá a relação exata entre as pressões estáticas das pontas; o logaritmo é a aceleração do gás que se expande:</p>
[[eq:isoClosed]]
<h4>Adiabático: Fanno</h4>
<p>Sem troca de calor, a temperatura de estagnação se conserva e o Mach cresce rumo a 1. As relações referidas ao ponto sônico (*):</p>
[[eq:fannoRel]]
[[eq:fannoLength]]
<h4>Marcha</h4>
<p>O método geral divide o tubo em 100 volumes e resolve em cada um, por Newton, o momento e a energia para o novo estado (ρ̄ e V̄ são as médias do volume):</p>
[[eq:marchMomentum]]
[[eq:marchEnergy]]
<p>A marcha calcula os tubos do modelo adiabático e os tubos com desnível do isotérmico, em que a gravidade entra pelo termo ρ̄gΔz. O tubo horizontal isotérmico usa a forma fechada, que a marcha reproduz. Perto do bloqueio o passo encolhe: cada volume muda o Mach em no máximo 0,005 e em no máximo 5% do que falta até o limite. O erro diante do Fanno exato é de 10⁻⁶ com Mach de saída 0,4, de cerca de 2·10⁻⁴ com 0,77 e de 10⁻³ com 0,94.</p>
<h4>Perdas localizadas</h4>
<p>A soma dos K do tubo, com as perdas de entrada e de saída das junções, entra como comprimento equivalente de atrito: somada a f·L/D na forma fechada e distribuída ao longo da marcha. Válvulas, orifícios e componentes genéricos são trechos de comprimento nulo com f·L/D = K, pela forma fechada isotérmica ou por Fanno. A correção laminar dos K é a mesma do líquido.</p>
[[eq:equivalentF]]`,
          },
          choking: {
            title: 'Bloqueio sônico',
            body: `<p>A vazão de um tubo tem um máximo, alcançado quando o gás chega ao Mach limite na saída:</p>
[[eq:chokeLimits]]
<p>Se a pressão a jusante pede mais vazão que isso, o tubo fica <b>bloqueado</b>: a vazão é a crítica, a maior que não bloqueia antes do fim do tubo; a pressão a jusante deixa de influenciá-la, e a expansão até a pressão do nó acontece fora do tubo. O app acha a vazão crítica pela própria relação do tubo.</p>
<h4>Entrada de um vaso</h4>
<p>Saindo de um nó de estagnação, como um reservatório, o gás acelera do repouso até a velocidade do tubo de forma isentrópica. No modelo adiabático:</p>
[[eq:entranceGas]]
<p>No isotérmico vale a mesma relação com o expoente −k/(k−1) e a temperatura do gás.</p>
<h4>Bocais e orifícios</h4>
<p>Um bocal descarrega de forma isentrópica pela área efetiva e bloqueia abaixo da razão crítica de pressões:</p>
[[eq:nozzleGas]]
<p>Um orifício é um elemento K cuja vazão também não passa da vazão crítica da veia contraída, de área C<sub>c</sub>·A<sub>o</sub>: C<sub>c</sub> = C<sub>d</sub> no modelo por C<sub>d</sub>, 0,61 com borda viva, e de 0,61 a 1 com a borda arredondada.</p>
[[eq:criticalFlux]]`,
          },
          network: {
            title: 'A rede de gás',
            body: `<p>A topologia é a mesma do líquido. As incógnitas são as pressões dos nós livres; cada ligação comum (tubo, válvula, orifício, bocal) dá a sua vazão mássica a partir das pressões dos seus dois nós, resolvendo a própria relação, com o teto da vazão crítica. Em cada nó livre fecha o balanço de massa:</p>
[[eq:continuity]]
<p>Válvulas de controle, compressores e ligações sem perda têm a vazão como incógnita e uma equação própria: a pressão ajustada, a razão de compressão, a diferença de pressões ou a vazão imposta.</p>
<h4>Que pressão cada nó leva</h4>
<p>No modelo isotérmico, as junções levam a <b>pressão estática</b>, o método clássico de redes de gás, que despreza a energia cinética na junção; no adiabático, a <b>de estagnação</b>. Os contornos mantêm a sua natureza: o reservatório é de estagnação, a pressão imposta é estática ou de estagnação conforme a escolha, e a pressão externa de um bocal ou de uma válvula de saída é estática. Cada tubo converte nas suas pontas.</p>
<h4>Solução</h4>
<p>Newton-Raphson sobre as pressões, com o Jacobiano montado das derivadas de cada ligação, eliminação de Gauss, busca linear e pressões sempre positivas. As primeiras pressões vêm da teoria linear de redes de gás sobre P². O cálculo converge quando cada nó fecha o balanço dentro de 10⁻⁸ da vazão que passa por ele. As válvulas de controle mudam de estado como no líquido, com novos cálculos até os estados se firmarem.</p>
<h4>Temperatura no modelo adiabático</h4>
<p>Um laço externo atualiza as temperaturas: com as vazões, a temperatura de estagnação de cada nó é a mistura, ponderada pela massa, do que chega a ele. As fontes mantêm a sua, e um compressor eleva a do gás que passa. O laço se repete até as temperaturas mudarem menos de 10⁻⁶. O cálculo adiabático parte da solução isotérmica da mesma rede.</p>
[[eq:gasMixing]]`,
          },
          machines: {
            title: 'Compressores e válvulas',
            body: `<p>Na razão fixa:</p>
[[eq:compRatio]]
<p>Pela curva, a altura <i>H</i> lida na vazão volumétrica da sucção, com as leis de afinidade, é a altura isentrópica do gás:</p>
[[eq:compHead]]
<p>A temperatura de descarga, com a eficiência politrópica η, e a potência entregue ao gás:</p>
[[eq:compHeat]]
<p>Com vazão imposta ou controle de pressão, a razão sai do cálculo, e a rotação que a curva pede é achada por bisseção, como na bomba de líquido. Válvulas por Cv e Kv viram um K equivalente na área do tubo de entrada, a mesma perda do líquido:</p>
[[eq:gasValveK]]`,
          },
          validation: {
            title: 'Validação e limites',
            body: `<h4>Validação</h4>
<p>Testes automáticos conferem a física e o cálculo de redes: as propriedades do ar; a forma fechada isotérmica nos dois sentidos; a marcha diante da forma fechada e de Fanno, inclusive a conservação da temperatura de estagnação; o bloqueio nos dois modelos; o limite incompressível (com queda pequena, a perda de Darcy); redes em série e ramificadas, com balanço de massa; o exemplo da linha de ar comprimido diante de um cálculo independente; a vazão crítica diante da forma fechada e de Fanno; a mistura de temperaturas; bocais e orifícios bloqueados; válvulas de controle; e o compressor.</p>
<h4>Fora do escopo</h4>
<ul>
<li>misturas de gases e mudança de composição;</li>
<li>troca de calor com o ambiente (o modelo é isotérmico ou adiabático);</li>
<li>transitórios, ondas de choque e escoamento supersônico (o cálculo vai até o bloqueio);</li>
<li>condensação e escoamento bifásico;</li>
<li>gás real por equação de estado (usa-se Z constante);</li>
<li>a razão crítica de pressões do obturador de uma válvula (a válvula é um elemento K).</li>
</ul>
<h4>Referências</h4>
<ul>
<li>Shapiro, A. H. (1953). <i>The Dynamics and Thermodynamics of Compressible Fluid Flow</i>.</li>
<li>Anderson, J. D. <i>Modern Compressible Flow</i>.</li>
<li>White, F. M. <i>Viscous Fluid Flow</i> (lei de Sutherland).</li>
</ul>`,
          },
        },
      },

      about: {
        title: 'Sobre',
        sections: {
          about: {
            title: 'Sobre o Pump It',
            body: `<p><b>Pump It</b> é um simulador de redes de tubulação em regime permanente, de líquidos (escoamento incompressível) e de gases (escoamento compressível), que roda no navegador, sem instalação e sem servidor.</p>
<ul>
<li>Escrito do zero, em <i>clean room</i>, a partir de métodos e dados públicos (veja [[go:tech.references|Validação e referências]]). Não usa marcas, nomes, ícones, textos ou telas de programas comerciais.</li>
<li>Interface em português, inglês e espanhol.</li>
<li>Os seus modelos ficam no seu computador: o app não os envia para nenhum servidor.</li>
</ul>
<p>Os resultados são uma ferramenta de engenharia: confira as hipóteses, os dados de entrada e os avisos antes de usá-los num projeto.</p>`,
          },
        },
      },
    },
  },
});
