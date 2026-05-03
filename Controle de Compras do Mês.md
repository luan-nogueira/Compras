# Controle de Compras do Mês

Este é um sistema web moderno e responsivo para gerenciar suas compras de mercado mensais, integrado com o **Firebase Firestore**.

## 🚀 Funcionalidades

- **Dashboard Inteligente**: Visualize o total previsto, total já comprado e pendente do mês selecionado.
- **Gerenciamento de Itens**: Cadastre, edite, exclua e marque itens como comprados.
- **Filtros Avançados**: Filtre sua lista por mês, categoria e status.
- **Planejamento Mensal**: Copie facilmente todos os itens de um mês para o próximo com apenas um clique.
- **Design Responsivo**: Interface limpa e profissional que funciona perfeitamente em celulares e computadores.

## 🛠️ Tecnologias Utilizadas

- HTML5 / CSS3 (Variáveis CSS, Flexbox, Grid)
- JavaScript (ES6+, Módulos)
- [Firebase Firestore](https://firebase.google.com/products/firestore) (Banco de dados em tempo real)
- [Font Awesome](https://fontawesome.com/) (Ícones)
- [Google Fonts](https://fonts.google.com/) (Fonte Inter)

## ⚙️ Como Configurar o Firebase

Para que o sistema funcione, você precisa conectar o seu próprio projeto do Firebase:

1. Vá para o [Console do Firebase](https://console.firebase.google.com/).
2. Clique em **"Adicionar projeto"** e siga as instruções.
3. No painel do projeto, clique no ícone de **Web (</>)** para registrar um novo app.
4. Copie o objeto `firebaseConfig` que aparecerá (contendo `apiKey`, `authDomain`, etc).
5. Abra o arquivo `script.js` do projeto.
6. Localize a constante `firebaseConfig` e substitua os valores pelos que você copiou do console.
7. No menu lateral do Firebase, vá em **Build > Firestore Database** e clique em **"Criar banco de dados"**.
8. Escolha o local do servidor e comece no **"Modo de Teste"** (para permitir leitura/escrita sem autenticação inicial).
9. Clique em **"Iniciar coleção"**, dê o nome de `compras` e adicione um documento de teste ou apenas feche (o sistema criará automaticamente ao salvar o primeiro item).

## 📂 Estrutura de Arquivos

- `index.html`: Estrutura da interface.
- `style.css`: Estilização e responsividade.
- `script.js`: Lógica do sistema e integração Firebase.
- `README.md`: Instruções de uso e configuração.

---
Desenvolvido com foco em simplicidade e eficiência.
