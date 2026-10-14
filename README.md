# Pump It

Simulador web de redes de tubulação em regime permanente, para escoamento incompressível. O usuário desenha a rede (tubos e junções) e preenche as propriedades. O cálculo é refeito automaticamente a cada alteração. Os resultados aparecem em tabelas, gráficos, numa ficha por objeto (clique direito) e no próprio desenho.

O produto não usa marcas, nomes, ícones, textos ou telas de nenhum software comercial.

## Como usar

- **Abrir:** dê dois cliques em `index.html` (funciona direto do disco, sem servidor e sem instalação). As fontes vêm do Google Fonts quando há internet; sem internet, o navegador usa fontes do sistema.
- **Testes do núcleo de cálculo:** `node tests/run-tests.js` (Node 18 ou mais novo).
- **Validação contra resultados gravados de referência:** `node tests/validate-fth.js "<pasta com arquivos .fth>"` (veja Verificação).

Fluxo de trabalho:

1. Arraste um tipo de junção da paleta para o desenho (ou clique no tipo e depois no desenho).
2. Ferramenta **Tubo** (tecla `P`): clique numa junção e depois em outra. O sentido de referência vai da primeira para a segunda. Clicar no vazio cria um nó.
3. Selecione um objeto para editar no inspetor à direita. O que falta para ele ficar definido aparece em vermelho.
4. Quando a lista de verificação ficar completa, o indicador no alto passa a **Calculado** e os resultados aparecem. Não há botão de executar: cada alteração recalcula o cenário atual.
5. Veja **Resultados** (tubos, junções, bombas, válvulas, avisos), **Gráficos** (bomba × sistema e perfil), a ficha do clique direito ou escolha "Resultados no desenho".

Atalhos e seleção:

| Ação | Como |
| --- | --- |
| Copiar e colar | `Ctrl+C` e `Ctrl+V` (copia as junções selecionadas, as pontas dos tubos selecionados e os tubos entre elas; cada colagem sai deslocada) |
| Selecionar vários | `Ctrl+clique` ou `Shift+clique`; `Shift+arrastar` no vazio seleciona por área; `Ctrl+A` seleciona tudo |
| Mover em grupo | arraste qualquer junção selecionada |
| Dados de um objeto | clique direito: vazão, velocidade, perda de carga, pressões, altura manométrica, elevação, comprimento etc. |
| Desfazer e refazer | `Ctrl+Z` e `Ctrl+Y` |
| Excluir | `Del` |
| Cancelar ferramenta | `Esc` |
| Zoom e vista | roda do mouse; arrastar o fundo |

Unidades padrão: vazão em m³/h, comprimento e cota em m, pressão em kgf/cm²(g), temperatura em °C. Diâmetros e rugosidade são digitados em mm. Cada campo guarda a unidade em que foi digitado, e cada coluna de resultado pode trocar de unidade sem recalcular.

## Resultados por tubo e exportação para Excel

A tabela **Resultados › Tubos** traz, nesta ordem: Tubo, Diâmetro nominal, Schedule, Elevação inicial (m), Elevação final (m), Vazão (m³/h), Velocidade (m/s), Pressão de estagnação na entrada (kgf/cm²(g)), Pressão de estagnação na saída (kgf/cm²(g)) e K (soma dos K dos acessórios do tubo, na área do tubo).

- **Exportar para Excel** gera um `.xlsx` com essas colunas na mesma ordem: cabeçalho formatado, números como valores numéricos com casas decimais fixas, linha 1 congelada e filtro. O gerador é próprio e não depende de bibliotecas externas.
- **Copiar para Excel** copia a mesma tabela para colar direto numa planilha.
- Na página publicada, o download passa pela confirmação do visualizador; no arquivo local, é um download comum.

## Escala de cores de velocidade

Em "Resultados no desenho › Velocidade", a cor de cada tubo segue uma escala fixa para água, e não o mínimo e o máximo do modelo. Assim, a mesma cor significa a mesma faixa em qualquer rede. A ficha do clique direito e o inspetor mostram a faixa ao lado da velocidade.

| Velocidade (m/s) | Cor | Faixa | Base |
| --- | --- | --- | --- |
| abaixo de 0,6 | azul | abaixo do mínimo usual | mínimo de autolimpeza de 0,6–0,7 m/s, para evitar sedimentação |
| 0,6 a 1,0 | azul → azul-esverdeado | baixa | tubo provavelmente superdimensionado para a vazão |
| 1,0 a 1,5 | azul-esverdeado → verde | faixa econômica, lado baixo | estudos de velocidade econômica em adutoras de recalque: 0,62–2,65 m/s |
| 1,5 a 2,5 | verde | faixa econômica | prática de recalque de 1–3 m/s; serviço geral de 1,2–3,0 m/s (Crane TP-410) |
| 2,5 a 3,0 | verde → amarelo | alta | 3 m/s é o limite superior usual para água |
| 3,0 a 5,0 | amarelo → laranja → vermelho | muito alta | erosão em aço carbono a partir de ~4,6 m/s (15 ft/s); risco maior de golpe de aríete |
| acima de 5,0 | preto | fora da escala | |

Os valores são referências de projeto, não limites normativos. A velocidade econômica de cada instalação depende do custo da energia, do tempo de operação, do desnível e do material. As faixas ficam em `js/core/data.js` (`WATER_VELOCITY`) e podem ser ajustadas ali.

Fontes consultadas:
- Caldas et al. (2016), velocidade econômica em adutoras de recalque (aço galvanizado 0,88–2,65 m/s; PVC 0,68–2,54 m/s): <https://periodicos.ufv.br/reveng/article/download/538/369/2945>
- Perroni et al. (2011), citado em anais da UFPel (aço galvanizado 0,67–1,63 m/s; PVC 0,62–1,97 m/s; 0,49–3,11 m/s medidos em 40 estações): <https://anais-siiepe.ufpel.edu.br/2015/CA_02884.pdf>
- Faixas de projeto de sucção e recalque, Crane TP-410 e limite de erosão em aço carbono (discussões técnicas): <https://www.eng-tips.com/viewthread.cfm?qid=425625>, <https://resources.skill-lync.com/branches/chemical-engineering/questions/fluid-mechanics-chem/pipe-sizing-velocity>
- Mínimo de ~0,7 m/s contra sedimentação e máximos de 5–8 ft/s em distribuição predial: <https://engineerexcel.com/water-velocity-in-pipe/>

## Estrutura

```
index.html            página e layout
css/app.css           estilos (tema claro e escuro)
js/core/              núcleo de cálculo, sem dependência de interface (roda no Node)
  units.js            unidades; SI no núcleo, conversão só na entrada e na saída
  fluids.js           água por correlações públicas; fluido do usuário
  data.js             tubos ASME B36.10M, rugosidades típicas, acessórios Crane
  hydraulics.js       Colebrook original, Hazen-Williams, ajuste de curvas, K de orifício
  model.js            esquema do modelo, tipos de junção, cenários, lista de verificação
  solver.js           rede, Newton, estados de válvulas, pós-processamento, curva do sistema
  examples.js         modelos de exemplo
js/ui/                interface (desenho, inspetor, tabelas, gráficos, ficha, planilha, aplicação)
tests/run-tests.js    verificação contra soluções independentes
tests/validate-fth.js validação contra resultados gravados de referência (seção 10 da especificação)
```

## O que está implementado

Referência: a especificação clean-room (`Clean Room.md`), seções 0 a 8.

| Área | Implementado |
| --- | --- |
| Desenho | Paleta, tubos com sentido de referência, mover (também em grupo), seleção múltipla, copiar e colar, apagar, inverter sentido, trocar tipo de junção mantendo dados compatíveis, grade com encaixe, zoom, pan, ajuste à tela, desfazer e refazer |
| Cálculo | Automático a cada alteração e ao trocar de cenário; lista de verificação mostra o que falta |
| Cenários | Árvore de cenários; o filho guarda só o que difere do pai; editar com o valor herdado religa ao pai; marcador de campo alterado; tabela de diferenças |
| Fluido | Água (Kell 1975, Vogel, IAPWS-IF97 região 4) ou ρ, μ e Pv do usuário |
| Tubos | Aço ASME B36.10M (Sch 40, 80, STD, XS) como padrão, ou diâmetro informado; seções circular, anel, retangular e não circular; incrustação; N tubos em paralelo; tubo fechado |
| Atrito | Rugosidade absoluta ou relativa, liso, f informado, Hazen-Williams, sem atrito; Colebrook na forma original (1,14 e 9,35); laminar 64/Re; transição linear entre Re 2300 e 4000 |
| Acessórios | Lista com quantidade; K constante ou K/f<sub>T</sub> (Crane); correção laminar ATKF, ATKF aprimorado ou nenhuma |
| Junções | Reservatório, pressão imposta, vazão imposta, bocal/aspersor, nó, bomba, válvula (K, Cv, Kv), válvula de controle (PRV, PSV, FCV, PDCV), **válvula de saída** (cota e pressão residual de saída, com perda opcional por K, Cv ou Kv), orifício, componente genérico (K ou curva ΔP × Q) |
| Bombas | Curva H × Q por mínimos quadrados ou interpolação; leis de afinidade; bombas em paralelo; velocidade variável controlando vazão ou pressão; eficiência, potência, NPSH. No modo **vazão fixa (dimensionamento)** a bomba informa a altura necessária e o painel não pede curva, eficiência nem NPSH |
| Saída | Resumo, fronteiras, tubos (formato acima), junções, bombas, válvulas e avisos em três níveis; ficha do clique direito; valores com unidade e cores no desenho; bomba × sistema; perfil de HGL, EGL e cota |
| Arquivos | Salvar e abrir `.json`; copiar e colar o modelo; exportar tubos para `.xlsx`; salvamento automático no navegador |

Removidos a pedido: mudança de área, curva, válvula de retenção, ponta morta e os fatores de projeto. Modelos antigos são convertidos ao abrir: retenção vira válvula, curva e mudança de área viram componente genérico com K, ponta morta vira vazão imposta zero. Perdas de curvas e retenções continuam disponíveis como acessórios do tubo (Crane).

### Fora desta versão

Os módulos XTS, GSC, ANS e SSL, o cálculo de custos, a transferência de calor e os fluidos não newtonianos (seções 4, 5 e 9 da especificação). Também ficaram de fora: tê/ípsilon detalhado, válvula de alívio, válvula de 3 vias, trocador de calor, ejetor, vertedouro, balanço de volume, cotas intermediárias, alertas de projeto, relatório NFPA e importação de arquivos de outros programas.

## Registro de clean room

**Fontes usadas na implementação:** a especificação `Clean Room.md` e as referências públicas do seu Anexo C. Não foram usados executáveis, ajuda, bancos `.dat`, telas nem textos do software de referência.

**Validação:** os arquivos de modelo `.fth` instalados no computador do usuário foram lidos apenas como gabarito de saída, como prevê a seção 10 (layout do Anexo A). Nenhum desses arquivos foi copiado para o projeto, e o validador só os lê na hora de rodar. Dois valores foram inferidos dessa comparação de resultados (marcados como *inferido*, conforme a regra da seção 0):

| Item | O que a comparação mostrou | Decisão |
| --- | --- | --- |
| Constante de Hazen-Williams | Em 6 modelos e mais de 50 tubos, com diâmetros de 102 a 2591 mm e velocidades de 0,06 a 3,6 m/s, a constante implícita de V = k·C·R<sub>h</sub><sup>0,63</sup>·S<sup>0,54</sup> é sempre 0,848684 (SI). Os expoentes clássicos batem; só o coeficiente difere de 0,8492 | Adotado k = 0,848684. Desvio em HW caiu de até 1,1·10⁻² para 2,5·10⁻⁵ |
| Correção laminar dos K nos modelos de verificação | Em escoamento laminar (Re ≈ 700 e 1100), o K efetivo calculado a partir das pressões gravadas é igual ao K turbulento informado. 143 de 145 arquivos usam a mesma opção | Esses modelos usam "nenhuma correção". O padrão do aplicativo continua ATKF aprimorado, conforme a especificação |

**Dados de engenharia e suas fontes primárias:**

| Dado | Fonte |
| --- | --- |
| Dimensões de tubo de aço | ASME B36.10M (diâmetro externo e espessura nominais) |
| K/f<sub>T</sub> de acessórios | Crane, Technical Paper 410 |
| f<sub>T</sub> por diâmetro | Colebrook totalmente turbulento com ε = 0,0018 in, no diâmetro interno real |
| Rugosidades típicas | Moody (1944); White, *Fluid Mechanics*, tab. 6.1 |
| Orifício | Idelchik, *Handbook of Hydraulic Resistance* |
| Densidade da água | Kell, G. S. (1975), *J. Chem. Eng. Data* 20(1) |
| Viscosidade da água | Equação de Vogel |
| Pressão de vapor da água | IAPWS-IF97, região 4 |
| Método de rede | Todini & Pilati (1988); Jeppson (1976) |

**Interface:** layout, símbolos, textos e cores próprios. Os símbolos seguem a convenção genérica de fluxograma de processo, desenhados aqui em SVG.

## Decisões de engenharia (pontos abertos do Anexo B)

| Ponto | Decisão |
| --- | --- |
| Chute inicial | 1 m/s em cada tubo no sentido de referência; pressões na média das referências. Converge em 4 a 7 iterações nos exemplos |
| Relaxação adaptativa | Busca linear com redução do passo pela metade sobre a norma escalada do resíduo; perto da solução o passo completo é sempre aceito. A convergência é medida no passo de Newton completo |
| Critério de convergência | Variação relativa ≤ tolerância (padrão 10⁻⁴) em duas iterações seguidas, com piso absoluto para vazões e pressões perto de zero |
| Hazen-Williams | Expoentes clássicos com k = 0,848684 (inferido, ver acima) |
| Transição laminar-turbulenta | Linear entre f<sub>lam</sub>(Re<sub>lam</sub>) e f<sub>turb</sub>(Re<sub>turb</sub>) |
| Correção laminar dos K (ATKF) | Fator max(1, f<sub>lam</sub>/f<sub>ref</sub>) abaixo de Re<sub>lam</sub>, interpolado até 1 em Re<sub>turb</sub> para a perda ficar contínua |
| SG em Cv e Kv | Água a 60 °F (999,0 kg/m³) para Cv; 1000 kg/m³ para Kv e para o fator K de aspersor |
| Válvula de saída | P<sub>0</sub> na ponta do tubo = pressão residual + perda da válvula (K na área do tubo, ou Cv/Kv). Com K = 0, P<sub>0</sub> na ponta = residual |
| Orifício por Cd | K = (1 − β⁴)/Cd² referido à velocidade no orifício |
| HGL e EGL | Calculadas com pressão absoluta, como na seção 0 |
| K do tubo na tabela de resultados | Soma dos K dos acessórios do tubo (K constante + n·f<sub>T</sub>), na área do tubo, sem correção laminar |
| Cenários | Topologia comum a todos os cenários; os cenários sobrescrevem propriedades |

## Verificação

`node tests/run-tests.js` executa 46 verificações contra soluções independentes. Entre elas:

- tubo único: Colebrook original analítico com desvio < 10⁻⁷;
- Hazen-Williams;
- ponto de operação de bomba por bisseção, também a 80% da rotação;
- curva do sistema;
- três reservatórios e rede malhada: continuidade e energia;
- VRP mantendo 3 kgf/cm²(g) e abrindo no pico;
- FCV;
- válvula de saída: residual exata e vazão analítica com K = 0 e K = 2;
- bomba de vazão fixa sem curva;
- aspersor;
- todos os exemplos.

`node tests/validate-fth.js` compara com os resultados gravados nos modelos de verificação de referência. Contorno: nos reservatórios, pressões impostas e válvulas de descarga, a pressão de estagnação gravada na ponta do tubo; o resto é calculado. A medida é o pior desvio do caso: vazão relativa à maior vazão, e pressão de estagnação nas pontas relativa à maior queda de pressão num tubo. Resultado:

| Conjunto | Casos comparados | Desvio mediano | Desvio máximo | Critério da seção 10 |
| --- | --- | --- | --- | --- |
| Darcy-Weisbach | 37 | 5,6·10⁻⁷ | 5,2·10⁻⁵ | ≤ 10⁻⁴: atendido |
| Hazen-Williams | 6 | 4,6·10⁻⁶ | 2,5·10⁻⁵ | ≤ 2·10⁻³: atendido |

Os 39 modelos de verificação que ficaram fora da comparação são estes:
- bombas com outra forma de curva (14);
- módulos SSL e ANS (13);
- mudança de área (5), removida do aplicativo;
- válvulas de controle cujo layout de arquivo não é documentado (4);
- K por tubo em nós (2);
- um modelo sem resultados.

Na pasta de exemplos não há gabarito comparável: 23 arquivos foram salvos sem resultados e os demais usam os módulos XTS, GSC, ANS ou SSL.
