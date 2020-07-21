# DOM+

> It's the classic DOM but with some extra icing on it.

> We've added a data driven layer so you can easily make changes to the Document Object Model.

> Please remember, this project is still highly experimental and nowhere near production ready.

---

## The concept
The idea was to connect certain parts of HTML content to a javascript data source object.
Because we wanted to easily change the DOM when data was changed.
An example would be an AJAX request to update some data.
When done the DOM must also be updated with the new data...just with one line of javascript code.

We didn't want to do this with Web Components or other great libraries like VueJS or React.
It had to be much simpler. We wanted no troubles with SEO.
The way to go was to make the connection between the DOM and a data object through HTML attributes.

#### Collections and Models
First you have to define a model with its properties. This model can be a part of other models with the same type or it can live on its own.

When you have multiple models with the same type, for example a list of products, then you have to define a collection. Also by setting an HTML attribute on an HTML element.

#### API
We only wanted to provide the mostly needed functions to keep the library as small as possible. Like `get` a collection or model, `insert` a new model (in a collection), `update` the properties of a model and `delete` a model or a collection.

Also we decided to implement the functions to make a `GET` and `POST` request through AJAX.


## Get started
The fastest way to get started is to load DOM+ via a CDN, like this:

```html
<script src="https://..." defer></script>
```

## Usage


## Examples