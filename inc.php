<?php

/**
 * Shared static values
 */
class config {
   
   public static $db_user = 'root';
   public static $db_password = 'mysql5';
   
}

/**
 * MySQLi database object
 */
class DBi extends mysqli {
   
  private $in_transaction = FALSE;
  
  function __construct($db) {
     
    parent::__construct('localhost', config::$db_user, config::$db_password, $db);
    if (mysqli_connect_error()) {
      die('Connect Error (' . mysqli_connect_errno() . ') ' . mysqli_connect_error());
    }
    
    $this->autocommit(TRUE);
  }
  
  function __destruct() {
     
    if ($this->in_transaction) $this->rollback();
    $this->close();
    
  }
  
  function startTransaction() {
     
    if (!$this->in_transaction) {
      $this->autocommit(FALSE);
      $this->in_transaction = TRUE;
    }
    
  }
  
  function commitTransaction() {
     
    if ($this->in_transaction) {
      $this->commit();
      $this->autocommit(TRUE);
      $this->in_transaction = FALSE;
    }
    
  }
  
  function rollbackTransaction() {
     
    if ($this->in_transaction) {
      $this->rollback();
      $this->autocommit(TRUE);
      $this->in_transaction = FALSE;
    }
    
  }
  
  function doSQL($query) {
     
    $return = FALSE;
    $result = $this->query($query);
    if (gettype($result) == 'object') {
      $return = array();
      while ($row = $result->fetch_assoc()) {
        $return[] = $row;
      }
      if (sizeof($return) == 0) $return = FALSE;
    } elseif ($result === TRUE) {
      if ($this->insert_id !== 0) {
        $return = $this->insert_id;
      } elseif ($this->affected_rows > -1) {
        $return = $this->affected_rows;
      }
    }
    return $return;
    
  }
  
  function select($table, $where='', $order='', $to='', $from='', $cols=array('*')) {
     
    $return = FALSE;
    $cols = implode(", ", $cols);
    $sql = "SELECT $cols FROM $table";
    if ($where != '') $sql .= " WHERE $where";
    if ($order != '') $sql .= " ORDER BY $order";
    if ($to != '') {
      if ($from != '') {
        $sql .= " LIMIT $from, $to";
      }
      else {
        $sql .= " LIMIT $to";
      }
    }
    $return = $this->doSQL($sql);
    return $return;
    
  }
  
  function insert($table, $data=array()) {
     
    $cols = array();
    $values = array();
    foreach ($data as $col=>$value) {
      if ($value !== '' && $value !== NULL) {
        $cols[] = $col;
        $values[] = $this->escape($value);
      }
    }
    $cols = implode("`, `", $cols);
    $values = implode("', '", $values);
    $sql = "INSERT INTO $table (`$cols`) VALUES ('$values')";
    $return = $this->doSQL($sql);
    return $return;
    
  }
  
  function update($table, $data=array(), $where='') {
     
    $cols = array_keys($data);
    $values = array_values($data);
    for ($i=0; $i<sizeof($data); $i++) {
      if ($values[$i] === '') {
        $values[$i] = 'NULL';
      } else {
        $values[$i] = "`" . $cols[$i] . "` = '" . $this->real_escape_string($values[$i]) . "'";
      }
    }
    $values = implode(", ", $values);
    $sql = "UPDATE $table SET $values";
    if ($where != '') $sql .= " WHERE $where";
    $return = $this->doSQL($sql);
    return $return;
    
  }
  
  function delete($table, $where='', $limit='', $order='', $deltabs='') {
     
    $sql = "DELETE ";
    if ($deltabs != '') $sql .= $deltabs . " ";
    $sql .= "FROM $table";
    if ($where != '') $sql .= " WHERE $where";
    if ($order != '') $sql .= " ORDER BY $order";
    if ($limit != '') {
      $sql .= " LIMIT $limit";
    }
    $return = $this->doSQL($sql);
    return $return;
    
  }
  
  public function escape($value) {
     
    return $this->real_escape_string($value);
    
  }
}
?>