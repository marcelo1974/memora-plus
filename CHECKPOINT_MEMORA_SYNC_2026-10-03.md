# MEMORA+ — correção da sincronização manual de respostas

Preparada a partir do pacote de 83 arquivos enviado pelo usuário, SHA-256 c3e44090f7a05531914114a77ddc3e4c26ffb235faf7ca22f0def9d460a9eca7. ZIP original preservado. Fase 4D pausada. Sem alteração de dependências, regras Firebase ou publicação.

## Alteração
O botão Configurações > Sincronizar Agora passa a buscar questões e histórico no servidor, unir respostas por ID, confirmar a gravação transacional local, atualizar a interface e enviar o histórico reunido à conta Google atual. Questões locais existentes são preservadas; apenas questões ausentes na nuvem são enviadas por esse botão, evitando sobrescrever suas versões remotas. Configurações continuam sendo enviadas como antes.

IDs iguais com conteúdo diferente interrompem a união antes da gravação local. Dados inválidos também são rejeitados. Campos de transporte são removidos das respostas. Respostas sem alternativa selecionada continuam undefined. Repetir a união não duplica registros.

Falhas de leitura não são interpretadas como banco vazio. A mensagem de sucesso exige confirmação de todos os passos. A sincronização envolve vários commits locais/remotos: uma falha posterior pode deixar parte dos passos concluída; repetir é permitido. Não há transação única entre IndexedDB e Firestore.

## Validação
npm run verify: TypeScript e lint sem erros, 31 testes aprovados, build/PWA gerados e seis verificações HTTP aprovadas. Dependências reaproveitadas do ambiente já instalado; não foi validada nova instalação limpa. Testes de persistência usam fake-indexeddb. Não houve teste com a conta Firebase real, nem publicação.

## Aplicação pelo GitHub
Extraia MEMORA_CORRECAO_SYNC_2026-10-03.zip. Os arquivos mantêm seus caminhos relativos. Substitua cada arquivo no mesmo caminho do repositório. Não envie o ZIP como código e não apague public/. Após o deploy, use primeiro um backup JSON atualizado em ambos os aparelhos.

## Teste real
1. Entre na mesma conta Google no PC e celular. Confira o e-mail mostrado antes de sincronizar.
2. No aparelho com o histórico mais completo, use Configurações > Sincronizar Agora e aguarde sucesso.
3. Repita no segundo aparelho e depois novamente no primeiro, para receber as respostas exclusivas de ambos.
4. Compare as estatísticas acumuladas. Sincronize novamente e confirme que a contagem não duplica.
5. Feche e reabra. Depois teste sem rede: dados locais devem permanecer; sincronização exige internet.

## Limites
Esta correção cobre histórico acumulado por sincronização manual. Não implementa sincronização contínua, sessões em nuvem, exclusões remotas, isolamento de várias contas no mesmo banco local nem resolução de conflitos de edição/SM-2 das questões. Use a mesma conta nos dois aparelhos; não alterne contas para este teste. O fluxo automático de login já existente permanece. Sem garantia de contadores e estados por questão convergirem; o histórico acumulado é o alvo desta correção.
