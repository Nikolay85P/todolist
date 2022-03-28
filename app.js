const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

mongoose.connect("mongodb+srv://admin-Nick:test123@cluster0.jc7ce.mongodb.net/todolistDB", {
  useNewUrlParser: true
});

const localPort = 3000;
const herokuPort = process.env.PORT;

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));

// чтобы сервер знал, какие файлы нужно обрабатывать как статические.
//например, стили CSS или изображения. В противном случае это не сработает.
app.use(express.static("public"));

// это необходимо для того, чтобы ejs работал правильно и отображал страницы так, как задумано
app.set('view engine', 'ejs');

// игнорировать фавикон, чтобы не создавать новый список дел с его именем
function ignoreFavicon(req, res, next) {
  if (req.originalUrl === '/favicon.ico') {
    res.status(204).json({
      nope: true
    });
  } else {
    next();
  }
}
app.use(ignoreFavicon);


// создаем схему, как информация будет храниться в базе данных.
const itemsSchema = {
  name: String
};

// Это создаст коллекцию в базе данных
const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your to do List!"
});

const defaultItems = [item1];

const listSchema = {
  listName: String,
  items: [itemsSchema]
};
const List = mongoose.model("List", listSchema);

app.get("/", (reg, res) => {
  Item.find({}, (err, foundItems) => {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, (err, docs) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Item successfully added");
        };
      });
      res.redirect("/");
    } else {
      List.find({}, (err, foundListItems) => {
        res.render('list', {
          listItemTitle: foundListItems,
          listTitle: "Today",
          newList: foundItems
        });
      });
    };
  });
});

// этот набор кода сообщает серверу, что делать, когда пользователь вводит информацию в форму
app.post("/", (req, res) => {
  // чтобы поймать, что пользователь ввел в форму
  const itemName = req.body.newToDo;
  const listName = req.body.list;

  let item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({
      listName: listName
    }, (err, foundList) => {
      foundList.items.push(item)
      foundList.save();
      res.redirect("/" + listName);
    })
  }
})

app.post("/newList", (req, res) => {
  const newToDoList = _.capitalize(req.body.newToDoList);

  List.findOne({
    listName: newToDoList
  }, (err, foundList) => {
    if (!err) {
      if (!foundList) {
        const list = new List({
          listName: newToDoList,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + newToDoList);
      } else {
        List.find({}, (err, foundListItems) => {
          res.render('list', {
            listItemTitle: foundListItems,
            listTitle: foundList.listName,
            newList: foundList.items
          });
        });
      }
    }
  });
})

app.post("/delete", (req, res) => {
  // нацелить кнопку-флажок, чтобы элемент можно было удалить
  const itemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.deleteOne({
      _id: itemId
    }, (err, docs) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Successful deletion");
      }
      res.redirect("/");
    });
  } else {
    List.findOneAndUpdate({
      listName: listName
    }, {
      $pull: {
        items: {
          _id: itemId
        }
      }
    }, (err, foundList) => {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

app.post("/deleteList", (req, res) => {
  const listID = req.body.listID;

  List.deleteOne({
    _id: listID
  }, (err) => {
    if (!err) {
      res.redirect("/");
    }
  });
})


// Чтобы удалить имена списка
app.post("/delete", (req, res) => {

});

app.get("/:list", (req, res) => {
  let newList = req.params.list;
  newList = _.capitalize(newList);
  List.findOne({
    listName: newList
  }, (err, foundList) => {
    if (!err) {
      if (!foundList) {
        const list = new List({
          listName: newList,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + newList);
      } else {
        // чтобы найти имена списка дел
        List.find({}, (err, foundListItems) => {
          res.render('list', {
            listItemTitle: foundListItems,
            listTitle: foundList.listName,
            newList: foundList.items
          });
        });
      }
    }
  });
});



app.get("/about", (reg, res) => {
  res.render('about');
});

app.listen(herokuPort || localPort, () => {
  console.log("Server is running");
})
