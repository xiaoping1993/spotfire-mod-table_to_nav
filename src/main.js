
/**
 * 处理原生js脚本
 */


/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.
/*
    api对象结构图参考:https://spotfiresoftware.github.io/spotfire-mods/overview 
    名字解释
    DataViewHierarchyNode
    在 Spotfire 这个数据分析软件中，DataView 是用来展示数据的核心组件，而 Hierarchy 则代表了数据的层次结构。那么，DataViewHierarchyNode 就是这个层次结构中的一个节点，代表着一部分数据或者数据的某种特定展示方式。
    举个例子来说，假设你正在分析一个公司的销售数据。这个数据可能包含了不同年份、不同季度、不同产品的销售额。在 Spotfire 中，你可以创建一个 DataView 来展示这些数据，并且按照年份、季度或产品来组织数据的层次结构。
    这时，每一个年份、每一个季度或每一个产品，都可以看作是一个 DataViewHierarchyNode。当你点击某个节点时，比如 2023 年这个节点，Spotfire 就会展示 2023 年的销售数据。如果你再进一步点击某个季度节点，比如 2023 年的第三季度，那么 Spotfire 就会展示 2023 年第三季度更详细的数据。
    所以，DataViewHierarchyNode 对象就像是大楼中的一层楼，帮助你组织和展示数据，让你能够更方便地分析和理解数据背后的故事

    DataViewHierarchyNode.rows(): Spotfire.DataViewRow[]
    返回与当前 DataViewHierarchyNode 对象及其所有子节点相关的 DataViewRow 对象数组
    假设你有一个按年份和产品类型组织的销售数据视图。在层次结构中，每个年份节点下可能都有几个产品类型节点，每个产品类型节点下又有具体的产品销售数据行。如果你选择了一个特定的年份节点并调用这个 rows() 方法，你将得到这个年份下所有产品类型和具体销售数据行的集合

    c.continuous(axis).value()
    获取当前行（`c`）在指定轴（`axis`）上的连续值

    c.categorical(axis).value()
    获取当前行（`c`）在指定轴（`axis`）上的分类值
    
    如何拿到文档属性
    mod.document.properties()
    
    经过调研
    场景描述：
    1：如何拿到Mod中表数据
    假如选择的表是element表
    name	tableAlisname	tablename
    element1	就诊	就诊信息表
    element1	诊断	诊断信息表
    element1	预后	预后信息表
    element1	重点实验室检查	重点实验室检查表
    element1	其他实验室检查	其他实验室检查表
    element1	物理检查	物理检查表
    element1	治疗	治疗表
    element1	病史	病史表
    element1	人口学	人口学表
    element2	就诊2	就诊信息2表
    element2	诊断2	诊断信息2表
    在mod-manifest.json中配置了
    "dataViewDefinition": {
        "axes": [
            {
                "name": "Element",
                "mode": "categorical",
                "placement": "bottom"
            },
            {
                "name": "subElement",
                "mode": "categorical",
                "placement": "left"
            }
        ]
    },
    假设我选得Element轴对应字段name;subElement轴对应字段tableAlisname
    1）先通过Spotfire这个全局变量找到mod对象
    Spotfire.initialize(async (mod) =>{});
    2）再通过订阅mod.createReader订阅的render回调函数拿到DataView对象
    const reader = mod.createReader(
        mod.visualization.data()
    );
    reader.subscribe(render);
    //回调函数
    async function render(dataView) {

    }
    2）拿到X轴数据xLeaves
    let xHierarchy = await dataView.hierarchy("X");
    let xRoot = await xHierarchy.root();
    let xLeaves = xRoot.leaves();
    3）再遍历xLeaves对象拿到X轴和X轴对应的Y轴信息
    var columnName = "";
    var values = []
    let xValues = xLeaves.map(x => {
      //拿X轴此节点信息
      column = x.key
      //X轴此节点对应的行数据
      var rows = column.rows();
      rows.forEach(row => {
        //拿到Y轴此节点信息
        const value = row.categorical("Y").value()[0].key;
        values.push(value);
      });
      return {
        column: column,
        values: values
      };
    });
    场景2：LDP Mods插件table表数据拿取原理？

*/


/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    //初始化文档属性
    try {
      const myProperty =await mod.property("myProperty");
      let modsInteractiveparamsDocument = await mod.document.property("tableToNavDocumentProperties");
      let value = modsInteractiveparamsDocument.value();
      if(value==""){
        modsInteractiveparamsDocument.set(myProperty.value().toString());
      }
      
    } catch (error) {
      mod.controls.errorOverlay.show("请先创建文档属性tableToNavDocumentProperties");
    }
    /**
     * Create the read function.
     * 通过创建reader让我们能读取mod相关信息，比如窗体信息，自定义信息，视图信息等
     */
    const reader = mod.createReader(mod.visualization.data());
    const reader2= mod.createReader(mod.document.property("tableToNavDocumentProperties"));
    /**
     * Store the context.
     * 获得mod的上下文，他提供了一些与mod交互的方法，例如显示错误信息，清除界面等，在本例中将使用他发送一个信号，表示mod准备好进行导出
     */
    const context = mod.getRenderContext();

    /**
     * Initiate the read loop
     * 定义数据视图reader的事件，当数据视图发生变化，就会触发render函数，render函数负责处理数据视图中数据并将其显示在模块中
     */
    reader.subscribe(render);
    reader2.subscribe(render2);

    /**
     * 监控文档属性的变化
     * @param {Spotfire.AnalysisProperty} documentPropetie 
     */
    async function render2(documentPropetie){
      let documentPropertieJSON = JSON.parse(documentPropetie.value());
      let statue = documentPropertieJSON.checkStatus
      let foldUnFold = documentPropertieJSON.foldUnFold
      if(statue){ 
        let checkStatusJson = documentPropertieJSON.checkStatusJson;
        doChecOutStatus(checkStatusJson)
        //处理结束将statue复原
        documentPropertieJSON.checkStatus = false
        documentPropetie.set(JSON.stringify(documentPropertieJSON))
      }
      if(foldUnFold.indexOf("true")>=0){
        $(".foldUnFold").text("全部折叠");
        let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
        let value = modsInteractiveparamsDocument.value()
        let paramJson = value==""?{}:JSON.parse(value.toString());
        paramJson.foldUnFold="true-noChange"
        modsInteractiveparamsDocument.set(JSON.stringify(paramJson))
        //还原
        documentPropertieJSON.foldUnFold = "false"
        documentPropetie.set(JSON.stringify(documentPropertieJSON))
      }
    }
    /**
     * @param {Spotfire.DataView} dataView
     * mod的可视化视图，提供了与spotfire DataTable交互的查询结果
     * 表示Mod可视化的属性，在manifest中定义的属性
     * 这里三个属性都是在前面mod.createReader指定的
     */
    async function render(dataView) {
        //由脚本操作等导致的dataView意外变化，只要是此情况都直接跳过，不处理
        let modsInteractiveparamsDocument = null;
        let documentPropertieValue = null;
        try {
          modsInteractiveparamsDocument = await mod.document.property("tableToNavDocumentProperties");  
          documentPropertieValue = modsInteractiveparamsDocument.value();
          let documentPropertieJSON = JSON.parse(documentPropertieValue.toString());
          let dataViewChanged = documentPropertieJSON.dataViewChanged;
          //必要时注释
          // if(dataViewChanged.indexOf("true")>=0){
          //   documentPropertieJSON.dataViewChanged="false";
          //   modsInteractiveparamsDocument.set(JSON.stringify(documentPropertieJSON));
          //   if($(".layui-nav-item").length>0){
          //       return;
          //   }
          // }
          if($(".layui-nav-item").length>0){
             return;
          }
        } catch (error) {
          mod.controls.errorOverlay.show("请先创建文档属性tableToNavDocumentProperties");
          return;
        }
        /**
         * Check the data view for errors
         * 处理报错信息
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Showing an error overlay will hide the mod iframe.
            // Clear the mod content here to avoid flickering effect of
            // an old configuration when next valid data view is received.
            //mod.controls:mod的可视化空间和其他UI组件，例如上下文菜单，工具提示等
            //mod.controls.errorOverlay：显示错误覆盖原生spotfire风格
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();

        /**
         * Get the hierarchy of the categorical X-axis.
         * 获得X轴的层次结构
         */
        //获得X轴的层次结构，在数据可视化中，X轴通常表示分类变量，Y轴表示数值变量，层次结构是一种数据结构，他将数据组织成树状结构，每个节点表示一个数据项，并包含该数据项的子数据项的信息
        const xHierarchy = await dataView.hierarchy("Element");
        //获取X轴的根节点，根节点没有父节点，因此它是所有节点的最顶层。如果X轴没有层次结构，或者X轴不是分类变量，则xHierarchy.root()方法将返回null
        const xRoot = await xHierarchy.root();

        if (xRoot == null) {
            // User interaction caused the data view to expire.
            // Don't clear the mod content here to avoid flickering.
            return;
        }
        let elementLeaves =xRoot.leaves();
        
        $('#element').empty();
        $('#subElement').empty();
        elementLeaves.forEach(element => {
          var column = element.key;
          //渲染X轴
          let newNavItem = $('<li class="layui-nav-item"><a class="elementLi">'+column+'</a></li>');
          $('#element').append(newNavItem);
          //X轴此节点对应的行数据
          var rows = element.rows();
          //处理排序字段。没有的话直接跳过
          // try {
          //   rows = rows.sort((row1,row2)=>row1.categorical("subElement").value()[1].key-row2.categorical("subElement").value()[1].key)
          // } catch (error) {
          //   console.log("这里功能是提供排序，只有你subElement选行了才能按此排序。我这里都是安装第二个subElement排序的")
          // }
          let subElementUl = $('<ul id="'+column+'" class="subElementUl layui-nav layui-bg-gray" style="text-align: center;display: none;"></ul>');
          $('#subElement').append(subElementUl);
          let fastNavItem = $('<li class="layui-nav-item"><a href="javascript:;">功能按钮</a><dl class="layui-nav-child"><dd><a class="saveConfig">保存配置</a></dd><dd><a class="useConfig">保存及应用</a></dd><dd><a class="useLastConfig">默认配置</a></dd><dd><a class="selectAll">全部勾选</a></dd><dd><a class="unselectAll">全不勾选</a></dd><dd><a class="foldUnFold">全部展开</a></dd></dl></li>')
          subElementUl.append(fastNavItem);
          rows.forEach(row => {
            //拿到Y轴此节点信息
            let value = row.categorical("subElement").value()[0].key;
            value = value.split(".")[1];
            //渲染Y轴
            let newNavItem = $('<li class="layui-nav-item"><a class="subElementLi" id="'+value+'">'+value+'</a></li>');
            subElementUl.append(newNavItem);
            $('#subElement').append(subElementUl);
          });
          layui.element.render('nav');
        })
        // 这里初始化时内容后，也恢复Y轴得统计数据（如果文档属性中有的话）
        let paramJson = documentPropertieValue==""?{}:JSON.parse(documentPropertieValue.toString());
        let checkStatusJson = paramJson.checkStatusJson;
        doChecOutStatus(checkStatusJson);
        //主动触发点击第一个element
        var firstLi = $('.elementLi').first();
        // 触发它的 click 事件
        setTimeout(() => {
          firstLi.click();  
        }, 1000);
        //初始化渲染选中内容
        let tableToNavDocumentProperties = await mod.document.property("tableToNavDocumentProperties");
        let tableToNavDocumentJSON = JSON.parse(tableToNavDocumentProperties.value());
        let statue = tableToNavDocumentJSON.checkStatus
        if(statue){ 
          let checkStatusJson = tableToNavDocumentJSON.checkStatusJson;
          doChecOutStatus(checkStatusJson)
          //处理结束将statue复原
          tableToNavDocumentJSON.checkStatus = false
          tableToNavDocumentProperties.set(JSON.stringify(tableToNavDocumentJSON))
        }
        /**
         * Signal that the mod is ready for export.
         * Mod准备好被导出了
         */
        context.signalRenderComplete();
    }
    //监听函数

    $('#element').on('click','.elementLi',async function(){
      const name = $(this).text();
      $(".subElementUl").hide();
      $("#" + name).show();
      let idCollection = [];
      $("#" + name + " .subElementLi").each(function() {  
        // 将每个a元素的id属性添加到数组中  
        idCollection.push($(this).attr('id'));
      })
      try {
        //将当前集合赋值到table_to_collapsibletables组件的文档属性tableToCollapsibletablesDocumentProperties中
        let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
        let value = modsInteractiveparamsDocument.value()
        let paramJson = value==""?{}:JSON.parse(value.toString());
        paramJson.showCategoryList=idCollection;
        paramJson.showCategoryStatue=true;
        modsInteractiveparamsDocument.set(JSON.stringify(paramJson));
      } catch (error) {
        console.log("未传输到table_to_collapsibletables中，请重试");
      }
      
    })
    //全选
    $('#subElement').on('click','.selectAll',async function(){
      let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
      let value = modsInteractiveparamsDocument.value()
      let paramJson = value==""?{}:JSON.parse(value.toString());
      paramJson.selectAll = "true-hasChanged";
      modsInteractiveparamsDocument.set(JSON.stringify(paramJson));
    })
    //全选
    $('#subElement').on('click','.unselectAll',async function(){
      let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
      let value = modsInteractiveparamsDocument.value()
      let paramJson = value==""?{}:JSON.parse(value.toString());
      paramJson.selectAll = "false-hasChanged";
      modsInteractiveparamsDocument.set(JSON.stringify(paramJson));
    })
    //处理Y轴点击事件，此功能需与另一个mods：table_to_collapsibletables配合使用
    $('#subElement').on('click','.subElementLi',async function(){
      let YName = $(this).text();
      YName = YName.replace(/（.*/,"")
      //滚动到指定位置高亮显示table
      try {
        let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
        let value = modsInteractiveparamsDocument.value()
        let paramJson = value==""?{}:JSON.parse(value.toString());
        paramJson.goToYName = YName+"-hasChanged";
        modsInteractiveparamsDocument.set(JSON.stringify(paramJson))
        setTimeout(() => {
          paramJson.goToYName=YName+"-noChange";
          modsInteractiveparamsDocument.set(JSON.stringify(paramJson))
        }, 2000);
      } catch (error) {
        layui.layer.msg('请先创建mods对象：table_to_collapsibletables或初始化对应文档属性');
      }
    })
    /**应用此配置
     */
    $('#subElement').on('click','.useConfig',function(){
      layui.layer.confirm('是否确认',async function(index){
        try {
          let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
          let value = modsInteractiveparamsDocument.value()
          let paramJson = value==""?{}:JSON.parse(value.toString());
          paramJson.useConfig="true";
          modsInteractiveparamsDocument.set(JSON.stringify(paramJson));
        } catch (error) {
          layui.layer.msg('请先创建mods对象：table_to_collapsibletables或初始化对应文档属性');
        }
        layui.layer.close(index);
      });
    })
    $('#subElement').on('click','.saveConfig',function(){
      layui.use(['layer', 'form'], function(){  
          var layer = layui.layer;  
          var form = layui.form;
          // 假设你有一个函数来动态创建表单  
          function createForm() {  
              var content = '<form class="layui-form" action="">' +  
                  '<div class="layui-form-item">' +  
                  '<label class="layui-form-label">Name</label>' +  
                  '<div class="layui-input-block">' +  
                  '<input style="margin-right: 60px;width: 200px;" type="text" name="name" required lay-verify="required" placeholder="请输入名称" autocomplete="off" class="layui-input">' +  
                  '</div>' +  
                  '</div>' +  
                  '<div class="layui-form-item">' +  
                  '<div class="layui-input-block">' +  
                  '<button class="layui-btn" lay-submit lay-filter="formDemo">提交</button>' +  
                  '</div>' +  
                  '</div>' +  
                  '</form>';  
              // 打开弹窗并设置内容  
              layer.open({  
                  type: 1,  
                  content: content,  
                  success: function(layero, index) {  
                      // 渲染表单（重要）  
                      form.render(); 
                      // 绑定表单提交事件  
                      form.on('submit(formDemo)', async function(data){
                          try {
                            let name = data.field.name;
                            let comment = "";
                            let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
                            let value = modsInteractiveparamsDocument.value()
                            let paramJson = value==""?{}:JSON.parse(value.toString());
                            paramJson.saveStatue="true";
                            paramJson.configName = name;
                            paramJson.configComment = comment;
                            modsInteractiveparamsDocument.set(JSON.stringify(paramJson));
                          } catch (error) {
                            layui.layer.msg('请先创建mods对象：table_to_collapsibletables或初始化对应文档属性');
                          }
                          layer.close(index); // 关闭弹窗  
                          return false; // 阻止表单跳转  
                      });  
                  }  
              });  
          }
          // 调用创建表单的函数
          createForm();
          
      });
    })
    //这里改为 使用模式配置，默认情况是全选所有字段
    $('#subElement').on('click','.useLastConfig',async function(){
      try {
        let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
        let value = modsInteractiveparamsDocument.value()
        let paramJson = value==""?{}:JSON.parse(value.toString());
        let time = new Date().toTimeString();
        paramJson.useLastConfig="default"+time.toString();
        modsInteractiveparamsDocument.set(JSON.stringify(paramJson))
      } catch (error) {
        layui.layer.msg('请先创建mods对象：table_to_collapsibletables或初始化对应文档属性');
      }
    })
    $('#subElement').on('click','.foldUnFold',async function(){
      try {
        let modsInteractiveparamsDocument = await mod.document.property("tableToCollapsibletablesDocumentProperties");
        let value = modsInteractiveparamsDocument.value()
        let paramJson = value==""?{}:JSON.parse(value.toString());
        let isFold = paramJson.foldUnFold.split("-")[0]
        isFold = isFold=="true"?"false":"true";
        paramJson.foldUnFold=isFold +"-hasChanged"
        modsInteractiveparamsDocument.set(JSON.stringify(paramJson))
        //table_to_collapsibletables 接受这个变化时的逻辑需考虑到初始化mods时候默认展开，这里也要有体现
        setTimeout(() => {
          if(isFold=="true"){
            $(".foldUnFold").text("全部折叠")
          }else{
            $(".foldUnFold").text("全部展开")
          }  
          paramJson.foldUnFold=isFold +"-noChange"
          modsInteractiveparamsDocument.set(JSON.stringify(paramJson))
        }, 500);
      } catch (error) {
        layui.layer.msg('请先创建mods对象：table_to_collapsibletables或初始化对应文档属性');
      }
    })
    /**
     * 根据tableId来获得当前状态下的 checkout数据
     * @param {JSON} checkStatusJson
     */
    function doChecOutStatus(checkStatusJson){
      Object.keys(checkStatusJson).forEach(keyId =>{
        let checkValue = checkStatusJson[keyId];
        $("#"+keyId).text(checkValue);
      });
    }
});