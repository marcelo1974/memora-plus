# MEMORA+ — proteção do vínculo de conta — 06/10/2026

## Origem
Preparado em cópia isolada do ZIP memora-plus-main.zip recebido em 06/10/2026, SHA-256 05545e2d5067a85540bd89a9a12dedec7a83b5161df9f604c3f9e9bd0a146b36. ZIP original preservado. Nenhuma alteração em dependências, regras Firestore, assets de marca, esquema do banco ou versão do IndexedDB. Fase 4D pausada. Não publicado pelo assistente.

## Comportamento
Login não carrega nem envia automaticamente questões/configurações. A sincronização manual permanece. Na primeira sincronização, o app pede confirmação explícita da conta que ficará vinculada ao banco local; conferir o e-mail antes de confirmar. Cancelar não vincula nem envia o histórico. O vínculo é salvo no metadata do IndexedDB com compare-and-set em transação, para impedir que duas abas reivindiquem contas diferentes.

A conta vinculada pode continuar usando dados offline e sincronizar no PC/Android. Cada aparelho precisa confirmar seu próprio banco local com a mesma conta. Outra conta não consegue sincronizar o banco vinculado, e a interface bloqueia a entrada quando detecta incompatibilidade. A checagem aguarda resolução do login antes de liberar a tela. Retornos automáticos antigos de login foram eliminados junto com o fluxo automático.

Os serviços Firebase verificam conta autenticada e proprietário local antes de acessar dados de estudo e antes dos commits em lote. A união local revalida autorização antes do commit. Erros de escrita de questões deixam de ser ocultados pelo serviço; chamadas na UI capturam essas falhas, preservando o dado local.

Sair mantém os dados e o proprietário local. O modo sem login continua podendo usar o banco local: esta é proteção contra sincronização acidental entre contas, NÃO é isolamento completo nem barreira de confidencialidade para usuários que compartilham o mesmo perfil de navegador. Para outra pessoa, usar perfil separado. Não há comando de transferência de propriedade. Backup restaurado/reset não remove o vínculo existente. Arquivo de backup não carrega o proprietário para outro dispositivo; o usuário confirma novamente nesse dispositivo.

O selo de login agora diz “Conta conectada”, evitando sugerir sincronização concluída por simples autenticação.

## Testes
npm run verify: código 0; TypeScript e lint aprovados; 40 testes aprovados, 0 falhas; build/PWA e seis checks HTTP aprovados. Nove testes adicionais versus baseline de 31: vínculo obrigatório, persistência/reconexão e bloqueio A→B/logout, concorrência, troca durante consulta, proprietário inválido, repetição, aborto de vínculo, bloqueio do commit local e preservação do vínculo em restore/reset. fake-indexeddb usado. Dependências instaladas reaproveitadas, instalação limpa não verificada. Não foi realizado teste real de duas contas Firebase ou teste automatizado da tela de login nesta etapa.

Warnings anteriores de tamanho de chunk e configuração ambiental npm permanecem.

## Aplicar em um commit
1. Exportar/guardar backup JSON atual em PC e Android.
2. Extrair MEMORA_PROTECAO_CONTAS_2026-10-06.zip.
3. Na raiz do GitHub, Add file > Upload files, enviar as pastas src e tests desta correção e este documento mantendo caminhos. Usar um único commit para não publicar versão intermediária sem o novo serviço.
4. Aguardar Render Live da nova revisão.
5. Atualizar o app, conferir a mesma conta Google e usar Sincronizar Agora. Confirmar vínculo somente com seu e-mail correto.
6. Repetir no segundo aparelho, comparar estatísticas, repetir sync sem duplicar, fechar/reabrir e testar offline. Não limpar dados.

## Pendências
Proteção de APIs IA/upload ainda não corrigida. Conflitos de estados SM-2/edições, exclusões, sessões e sincronização contínua permanecem fora desta correção. Segurança completa e suporte multiusuário exigem bancos isolados ou migração de espaços por conta, além de testes Firebase Emulator/reais.
