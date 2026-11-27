# NOIRVERSE

Abra `index.html` em um navegador com WebGL habilitado. O jogo funciona localmente, sem servidor.

- Use WASD ou as setas para andar, arraste o cenário para girar a câmera e use espaço para pular.
- Aproxime-se do círculo em frente a um prédio e pressione Enter ou E: a porta se abre e o personagem entra no espaço. Use **Voltar ao mundo** para sair.
- No celular, mantenha os botões direcionais pressionados e arraste o cenário para girar a câmera.
- No prédio central, caminhe pelo hall e escolha a porta da **Argos** ou de **Negócios pessoais**. A porta da Argos abre o site de administração na mesma aba; use o botão Voltar do navegador para retornar ao jogo. O login acontece no próprio site. Para sair do hall, aproxime-se da porta de saída à direita e pressione Enter.
- O escritório de **Negócios pessoais** mantém seus projetos, tarefas, finanças, portfólio e certificados, incluindo os registros anteriores. Os registros que já existiam no escritório Argos do jogo permanecem salvos no navegador, mas não são enviados ao site nem ficam acessíveis pela porta. Em **Projetos**, marque os itens que deseja reunir no **Portfólio** e adicione links opcionais; esse portfólio é uma organização pessoal neste navegador, não uma página pública.
- Em **Treinos**, organize exercícios, séries e dias. A faculdade fica na parte da frente do mundo: entre para organizar **Estudos**, provas e calendário. O botão **Entrar na faculdade** abre o portal da Cruzeiro do Sul em outra aba; o login acontece no próprio portal. Cada espaço tem uma visão geral de pendências e conquistas.
- Em **Personalizar**, escolha entre o visual casual e um traje original de herói, ajustando suas cores. O telão mostra o progresso de treinos, estudos e tarefas dos dois escritórios.

Os registros da versão anterior são preservados. Os registros e a aparência ficam somente neste navegador e dispositivo, sem conta ou sincronização; limpar os dados do navegador pode apagá-los.

O mundo 3D usa Three.js, cuja licença está em `vendor/THREE-LICENSE.txt`.

A iluminação usa um céu em gradiente gerado localmente, névoa, luz ambiente e uma luz solar com sombras. Não há pós-processamento ou luzes extras com sombras; o hall tem iluminação própria.

As calçadas usam textura procedural gerada localmente, e os vidros externos refletem uma imagem estática do céu. Esses reflexos não mostram prédios ou personagens e não precisam de uma segunda renderização da cena.

O movimento acelera suavemente ao começar a andar e para ao soltar a tecla. A câmera acompanha o personagem e se aproxima quando há uma parede entre os dois. O salto tem gravidade e uma pequena reação ao pousar; poeira leve aparece ao caminhar e pousar no exterior. As colisões continuam simplificadas, sem motor de física.

Bancos e jardineiras decoram as laterais dos caminhos e têm colisão para não serem atravessados pelo personagem.
