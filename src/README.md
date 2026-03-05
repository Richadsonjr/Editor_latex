# LaTeX Visual Editor

Uma aplicação web moderna para criação e edição de documentos LaTeX de forma visual e intuitiva. Projetada para funcionar diretamente no navegador, oferecendo uma experiência fluida sem necessidade de configurações complexas de backend.

## 🚀 Funcionalidades Principais

### ✍️ Edição Visual (WYSIWYG)
*   **Interface Amigável:** Escreva e formate seu texto (negrito, itálico, listas, cabeçalhos) como em um editor de texto comum.
*   **Conversão Automática:** O editor converte automaticamente seu conteúdo visual para código LaTeX válido em tempo real.

### 👁️ Visualização de Código
*   **Split View:** Acompanhe o código LaTeX gerado instantaneamente em um painel lateral.
*   **Controle Total:** Oculte ou exiba o painel de código conforme sua necessidade.

### 📂 Gerenciamento de Documentos
*   **Múltiplos Documentos:** Crie e gerencie vários projetos simultaneamente.
*   **Salvamento Automático:** Seus documentos são salvos automaticamente no armazenamento local do navegador (Local Storage), garantindo que você não perca seu trabalho mesmo se fechar a aba.
*   **Organização:** Renomeie títulos e exclua documentos antigos facilmente.

### 🔄 Importação e Exportação
*   **Importar .tex:** Traga seus arquivos LaTeX existentes para dentro da aplicação e continue editando visualmente.
*   **Exportar .tex:** Baixe seu trabalho finalizado como um arquivo `.tex` padrão, pronto para ser compilado em qualquer distribuição LaTeX (como Overleaf ou TeXShop).

### 🌐 Totalmente Client-Side
*   **Offline First:** A aplicação roda inteiramente no seu navegador.
*   **Hospedagem Simples:** Otimizada para rodar em serviços de hospedagem estática como GitHub Pages, Vercel ou Netlify.

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** React 19, TypeScript
*   **Estilização:** Tailwind CSS v4
*   **Editor:** Tiptap (Headless wrapper para ProseMirror)
*   **Ícones:** Lucide React
*   **Build:** Vite

## 📦 Como Rodar Localmente

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
3.  Para gerar a versão de produção (GitHub Pages):
    ```bash
    npm run build
    ```
