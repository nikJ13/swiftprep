class ProductsAPI {

    cartItems: { id: any; name: any; price: number; subtotal: number; quantity: number; }[] = [];
    products: any[] = [];
    productList: any = null;
    cartTable: any = null;
    constructor() {
        this.cartItems = [];
        this.products = [];
        this.productList = null;
        this.cartTable = null;
    }

    initialize(productlistcomponent: string, cartcomponent: string) {

        this.productList = document.getElementById(productlistcomponent);
        this.cartTable = document.getElementById(cartcomponent);
    }

    async  loadProducts() {
        const response = await fetch('https://54tcqd60xa.execute-api.us-east-1.amazonaws.com/dev');
        this.products = await response.json();
        this.createListWithInnerHTML(this.products)
    }
    // product list management operations (product list, cart)
    createListWithInnerHTML(products: any[]) {

        products.forEach((product: { image: string; name: any; price: any; id: any; }) => {

            var card = document.createElement("DIV");
            card.classList.add('card')
            card.style.maxWidth = '250px'
            card.style.minWidth = '250px'
            card.style.marginRight = '20px'
            card.style.marginBottom = '10px'

            var cardimage = document.createElement("img")
            cardimage.style.height = '150px';
            cardimage.style.width = '250px';

            cardimage.classList.add('card-img-top')
            cardimage.src = product.image
            card.appendChild(cardimage);

            var cardbody = document.createElement("DIV");
            cardbody.classList.add('card-body');
            card.append(cardbody)
            var cardtext = document.createElement("p");
            cardtext.classList.add('card-text');
            cardtext.innerHTML = `<b>${product.name}</b> <br> <span class="badge badge-info">${product.price} $ </span>   <br>`
            var addToCartButton = this.createButton('Add To Cart', () => {
                this.addToCart(product.id)
            })
            addToCartButton.style.marginLeft = "50px";
            addToCartButton.classList.add("btn")
            addToCartButton.classList.add("btn-link")

            cardtext.appendChild(addToCartButton);
            cardbody.appendChild(cardtext)

            this.productList.appendChild(card)

        })

        //    const html = rows.join();
        //    console.log('html',html)
    }
    generateCart(cartItems: any[]) {
        let totalAmount = 0;
        // Find a <table> element with id="myTable":
        var rowCount = this.cartTable.rows.length;
        for (var x = rowCount - 1; x > 0; x--) {
            this.cartTable.deleteRow(x);
        }
        cartItems.forEach((item: { name: any; price: any; quantity: any; subtotal: string; id: any; }) => {
            // Create an empty <tr> element and add it to the 1st position of the table:
            var row = this.cartTable.insertRow();

            // Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
            var product = row.insertCell(0);
            var price = row.insertCell(1);
            var quantity = row.insertCell(2);
            var subtotal = row.insertCell(3);
            var actions = row.insertCell(4);


            // Add some text to the new cells:
            product.innerHTML = item.name;
            price.innerHTML = item.price;
            quantity.innerHTML = item.quantity;
            subtotal.innerHTML = item.subtotal;
            var remotefromcartbtn = this.createButton('X', () => {
                this.removeFromCart(item.id)
            })
            remotefromcartbtn.classList.add('btn')
            remotefromcartbtn.classList.add('btn-sm')
            remotefromcartbtn.classList.add('btn-danger')
            actions.appendChild(remotefromcartbtn)
            totalAmount += parseInt(item.subtotal)
        });

        document.getElementsByName("total-amount").forEach(item => { item.innerHTML = totalAmount.toString() });
        document.getElementsByName("total-items").forEach(item => { item.innerHTML = cartItems.length.toString() });

    }
    createButton(label: string, handler: { (): void; (): void; (this: HTMLElement, ev: MouseEvent): any; }) {
        var btn = document.createElement("BUTTON");
        btn.addEventListener('click', handler);
        btn.innerHTML = label;
        return btn;
    }
    removeFromCart(id: any) {
        this.cartItems.splice(this.cartItems.findIndex(z => z.id == id), 1)

        this.generateCart(this.cartItems)
    }
    addToCart(id: any) {
        var existing = this.cartItems.find(z => z.id == id)
        if (existing) {
            existing.quantity += 1;
            existing.subtotal = existing.quantity * existing.price
        }
        else {
            var item = this.products.find(z => z.id == id)
            this.cartItems.push({
                id: item.id,
                name: item.name,
                price: parseInt(item.price),
                subtotal: parseInt(item.price),
                quantity: 1
            })
        }
        this.generateCart(this.cartItems)
    }
    getParameterByName(name: string, url: string) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }
}

export default new ProductsAPI();

