# Elfender — Forja e Combate

Jogo tático de defesa em pistas com forja alquímica de tropas, montagem de deck e invocação de monstros. Feito com React 19, Vite e Tailwind 4.

## Jogar

Abra o `index.html` com duplo clique. Ele é o jogo inteiro empacotado num arquivo só e precisa ser gerado de novo a cada mudança no código.

## Rodar localmente (desenvolvimento)

Pré-requisito: Node.js 20 ou mais novo.

```bash
npm install
npm run dev      # abre em http://localhost:3000/dev.html
npm run lint     # checagem de tipos (tsc)
npm run build    # gera a versão de produção em dist/
```

O jogo roda 100% no navegador e salva o progresso no localStorage. Não precisa de chave de API.
